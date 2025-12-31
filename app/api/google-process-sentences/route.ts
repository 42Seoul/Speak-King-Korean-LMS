import { NextResponse } from 'next/server';
import { GoogleGenAI, SchemaType } from '@google/genai';

// Initialize Gemini AI client
const getGeminiClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in environment variables');
  }
  return new GoogleGenAI({ apiKey });
};

interface VoiceOptions {
  voiceName: string;
  modelName?: string;
  voicePrompt?: string; // For Gemini natural language control
  audioEncoding: 'MP3' | 'WAV' | 'OGG';
  speakingRate?: number;
  pitch?: number;
  languageCode: string;
}

interface ProcessedItem {
  id: number;
  original: string;
  translation: string;
  corrected: string;
  binaryData: string | null; // Base64
  audioFileName: string;
  error: string | null;
}

// Gemini TTS Voice Mapping
const GEMINI_VOICE_MAP: Record<string, string> = {
  // Legacy Google Cloud TTS to Gemini TTS mapping
  'ko-KR-Neural2-A': 'Kore',
  'ko-KR-Neural2-B': 'Puck',
  'ko-KR-Neural2-C': 'Charon',
  'ko-KR-Standard-A': 'Kore',
  'ko-KR-Standard-B': 'Puck',

  // Direct Gemini voice names
  'Kore': 'Kore',
  'Puck': 'Puck',
  'Charon': 'Charon',
  'Kore-en': 'Kore',
  'Aoede': 'Aoede',
  'Fenrir': 'Fenrir',
  'Orbit': 'Orbit',

  // Default fallback
  'default': 'Kore'
};

// Simple concurrency limiter
async function asyncPool<T>(poolLimit: number, array: any[], iteratorFn: (item: any, array: any[]) => Promise<T>) {
  const ret: Promise<T>[] = [];
  const executing: Promise<any>[] = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

// Translation Helper
async function translateText(text: string): Promise<string> {
  try {
    // Try Google Translate (Unofficial free API) which is more reliable for simple strings
    // than overloaded public LibreTranslate instances.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Translation API status: ${res.status}`);

    const data = await res.json();
    // Google Translate structure: [[["Translated Text","Original Text",...],...],...]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
  } catch (e) {
    console.warn('Google Translate fallback failed, trying LibreTranslate...', e);
    
    // Fallback: LibreTranslate
    try {
        const libreUrl = 'https://libretranslate.de/translate';
        const res = await fetch(libreUrl, {
          method: 'POST',
          body: JSON.stringify({
            q: text,
            source: 'ko',
            target: 'en',
            format: 'text'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const textRes = await res.text();
        if (textRes.trim().startsWith('<')) {
            throw new Error('LibreTranslate returned HTML instead of JSON');
        }

        if (res.ok) {
          const data = JSON.parse(textRes);
          return data.translatedText || '';
        }
    } catch (e2) {
        console.warn('All translation attempts failed', e2);
    }
  }
  return '';
}

// Convert PCM to WAV format by adding WAV header
function pcmToWav(base64Pcm: string, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): string {
  // Decode base64 PCM data
  const pcmData = Buffer.from(base64Pcm, 'base64');
  const dataLength = pcmData.length;

  // Create WAV header (44 bytes)
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4); // File size - 8
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  // Combine header and PCM data
  const wavBuffer = Buffer.concat([header, pcmData]);

  // Return as base64
  return wavBuffer.toString('base64');
}

async function generateAudioWithGemini(text: string, options: VoiceOptions): Promise<string> {
  const ai = getGeminiClient();

  const geminiVoiceName = GEMINI_VOICE_MAP[options.voiceName] || GEMINI_VOICE_MAP['default'];
  const modelName = 'gemini-2.5-flash-preview-tts';

  // NOTE: The gemini-2.5-flash-preview-tts model is extremely strict.
  // It DOES NOT accept natural language instructions for speed/pitch/style in the prompt.
  // Any extra text causes a "Model tried to generate text" error.
  // We strictly send ONLY the text content.
  // ALSO: Wrapping in quotes helps prevent the model from treating short words (e.g. "Hello") as chat messages.
  const userPrompt = `"${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        // Note: Gemini TTS always returns PCM audio (24kHz, mono, 16-bit)
        // There is NO way to request MP3 or other formats via API configuration
        // We must convert PCM to WAV on the server side
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: geminiVoiceName
            }
          }
        }
      }
    });

    // Method 1: Try to find audio in candidates.content.parts (most common)
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio') && part.inlineData?.data) {
          const audioData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;

          console.log('✅ Audio found in candidate.content.parts');
          console.log(`   - MIME Type: ${mimeType}`);
          console.log(`   - Data size: ${audioData.length} characters (base64)`);
          console.log(`   - Preview: ${audioData.substring(0, 50)}...`);
          console.log('🔄 Converting PCM to WAV...');

          // Convert PCM to WAV format
          const wavBase64 = pcmToWav(audioData);
          console.log(`✅ Conversion complete - WAV size: ${wavBase64.length} characters (base64)`);

          return wavBase64;
        }
      }
    }

    // Method 2: Check if audio is at root level (alternative response format)
    if ((response as any).audio?.data) {
      const audioData = (response as any).audio.data;
      console.log('✅ Audio found in response.audio.data');
      console.log(`   - Data size: ${audioData.length} characters (base64)`);
      const wavBase64 = pcmToWav(audioData);
      return wavBase64;
    }

    // Method 3: Check usageMetadata or other possible locations
    const responseObj = response as any;
    if (responseObj.usageMetadata?.audioMetadata?.data) {
      const audioData = responseObj.usageMetadata.audioMetadata.data;
      console.log('✅ Audio found in usageMetadata.audioMetadata');
      console.log(`   - Data size: ${audioData.length} characters (base64)`);
      const wavBase64 = pcmToWav(audioData);
      return wavBase64;
    }

    // If we reach here, audio was not found
    console.error('❌ No audio content found');
    console.error('Response structure:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length,
      hasAudio: !!(response as any).audio,
      hasUsageMetadata: !!responseObj.usageMetadata,
      modelVersion: (response as any).modelVersion
    });
    throw new Error('No audio content found in Gemini TTS response');

  } catch (error: any) {
    console.error(`❌ Gemini TTS Error for voice ${geminiVoiceName}:`, error);
    if (error.message?.includes('responseMimeType')) {
      console.log('💡 Retrying without responseMimeType...');
      // Retry without responseMimeType if it's not supported
      return generateAudioWithGeminiFallback(text, geminiVoiceName);
    }
    throw error;
  }
}

// Fallback function without responseMimeType
async function generateAudioWithGeminiFallback(text: string, geminiVoiceName: string): Promise<string> {
  const ai = getGeminiClient();
  const modelName = 'gemini-2.5-flash-preview-tts';
  const userPrompt = `"${text}"`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: geminiVoiceName
          }
        }
      }
    }
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        console.log('✅ Audio found in fallback (candidate.content.parts)');
        console.log(`   - Data size: ${part.inlineData.data.length} characters (base64)`);
        // Convert PCM to WAV
        return pcmToWav(part.inlineData.data);
      }
    }
  }

  if ((response as any).audio?.data) {
    const audioData = (response as any).audio.data;
    console.log('✅ Audio found in fallback (response.audio.data)');
    console.log(`   - Data size: ${audioData.length} characters (base64)`);
    // Convert PCM to WAV
    return pcmToWav(audioData);
  }

  console.error('❌ No audio content found even in fallback');
  throw new Error('No audio content found even in fallback');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawSentences, voiceOptions } = body as { rawSentences: string[], voiceOptions: VoiceOptions };

    if (!rawSentences || !Array.isArray(rawSentences)) {
      return NextResponse.json({ error: 'Invalid input: rawSentences must be an array' }, { status: 400 });
    }

    // Process with concurrency limit (3) to avoid rate limits
    const results = await asyncPool(3, rawSentences, async (text, _) => {
      // Index isn't available directly in asyncPool iterator, so we find it or pass it. 
      // For simplicity, we'll re-map ID later or assume order is preserved (Promise.all preserves order).
      
      const id = Date.now(); // Temporary ID, client should handle ordering

      try {
        // Parallel: Translate & Audio
        const [translation, audioBase64] = await Promise.all([
          translateText(text),
          generateAudioWithGemini(text, voiceOptions)
        ]);

        return {
          id, // Placeholder
          original: text,
          corrected: text,
          translation,
          binaryData: audioBase64,
          audioFileName: `sentence_${id}.wav`,
          error: null
        };

      } catch (error: any) {
        return {
          id,
          original: text,
          corrected: text,
          translation: '',
          binaryData: null,
          audioFileName: '',
          error: error.message || 'Processing failed'
        };
      }
    });

    // Fix IDs to be sequential based on original order
    const orderedResults = results.map((r, i) => ({
      ...r,
      id: i + 1,
      audioFileName: `sentence_${i + 1}.wav` // WAV format (converted from PCM)
    }));

    return NextResponse.json(orderedResults);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
