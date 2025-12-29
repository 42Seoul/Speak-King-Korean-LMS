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
        // responseMimeType is NOT supported for this model in generateContent
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
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio'));
    
    if (audioPart?.inlineData?.data) {
      return audioPart.inlineData.data;
    }

    if ((response as any).audio?.data) {
        return (response as any).audio.data;
    }

    throw new Error('No audio content found in Gemini TTS response');

  } catch (error: any) {
    console.error(`Gemini TTS Error for voice ${geminiVoiceName}:`, error);
    throw error;
  }
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
          audioFileName: `sentence_${id}.mp3`,
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
      audioFileName: `sentence_${i + 1}.mp3`
    }));

    return NextResponse.json(orderedResults);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
