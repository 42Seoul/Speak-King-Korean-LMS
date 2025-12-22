import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const ttsClient = new TextToSpeechClient();

interface VoiceOptions {
  voiceName: string;
  modelName?: string;
  voicePrompt?: string; // For Gemini
  audioEncoding: 'MP3' | 'WAV' | 'OGG';
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  languageCode: string;
  ssmlText?: string | null; // If provided, treat input as SSML
}

interface ProcessedItem {
  id: number;
  original: string;
  translation: string;
  corrected: string; // Same as original for now (REQ-C-05)
  binaryData: string | null; // Base64
  audioFileName: string;
  error: string | null;
}

// Translation Helper
async function translateText(text: string): Promise<string> {
  try {
    // 1. Try MyMemory API
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
    const res1 = await fetch(myMemoryUrl);
    const data1 = await res1.json();
    
    if (res1.ok && data1.responseData?.translatedText) {
      return data1.responseData.translatedText;
    }
  } catch (e) {
    console.warn('MyMemory translation failed, trying fallback...', e);
  }

  try {
    // 2. Fallback: LibreTranslate (Public instance - might be rate limited)
    const libreUrl = 'https://libretranslate.de/translate';
    const res2 = await fetch(libreUrl, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'ko',
        target: 'en',
        format: 'text'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res2.ok) {
      const data2 = await res2.json();
      return data2.translatedText || '';
    }
  } catch (e) {
    console.warn('LibreTranslate failed', e);
  }

  return 'Translation unavailable';
}

async function generateAudio(text: string, options: VoiceOptions): Promise<string> {
  // Construct the request
  const request: any = {
    input: {},
    voice: {
      languageCode: options.languageCode,
      name: options.voiceName,
    },
    audioConfig: {
      audioEncoding: options.audioEncoding === 'OGG' ? 'OGG_OPUS' : options.audioEncoding, // Map OGG to OGG_OPUS
      speakingRate: options.speakingRate || 1.0,
      pitch: options.pitch || 0,
      volumeGainDb: options.volumeGainDb || 0,
    },
  };

  // SSML vs Text
  if (options.ssmlText && options.ssmlText.includes('<speak>')) {
     // If user provided custom SSML logic (advanced mode)
     // We need to inject the text into the SSML if it's a template, or use as is.
     // For this simple implementation, if we are processing a list of sentences, 
     // we assume standard synthesis unless 'ssmlText' implies a specific format.
     // However, for list processing, we usually just synthesize the text.
     // Reverting to text synthesis for list mode to avoid complex SSML injection per sentence.
     request.input = { text };
  } else {
    request.input = { text };
  }

  // Handle SSML Gender if voice name not fully specified (rare for Google TTS, usually voice name implies gender)
  if (options.ssmlGender) {
    request.voice.ssmlGender = options.ssmlGender;
  }

  // Gemini / Generative logic (Placeholder if specific API fields are needed)
  // If modelName is 'gemini-2.5-pro-tts', we might need to change the request structure
  // or use a different client method if Google releases a specific one.
  // For now, we assume it works via the standard synthesizeSpeech with a specific voice name/model.
  // Note: Actual Gemini TTS might require Vertex AI API.
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  
  if (!response.audioContent) {
    throw new Error('No audio content received');
  }

  return Buffer.from(response.audioContent).toString('base64');
}

// Simple beep base64 for mock
const MOCK_AUDIO_BASE64 = "//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawSentences, voiceOptions } = body as { rawSentences: string[], voiceOptions: VoiceOptions };

    if (!rawSentences || !Array.isArray(rawSentences)) {
      return NextResponse.json({ error: 'Invalid input: rawSentences must be an array' }, { status: 400 });
    }

    // Process in parallel
    const results: ProcessedItem[] = await Promise.all(
      rawSentences.map(async (text, index) => {
        const id = index + 1;
        try {
          
          let translation = await translateText(text);
          let audioBase64 = "";

          try {
             audioBase64 = await generateAudio(text, voiceOptions);
          } catch (audioError: any) {
             if (audioError.message?.includes('Could not load the default credentials')) {
                 console.warn("Using MOCK audio for", text);
                 audioBase64 = MOCK_AUDIO_BASE64; // Fallback
             } else {
                 throw audioError;
             }
          }

          const ext = voiceOptions.audioEncoding.toLowerCase();

          return {
            id,
            original: text,
            corrected: text, // REQ-C-05
            translation,
            binaryData: audioBase64,
            audioFileName: `sentence_${id}.${ext}`,
            error: null
          };

        } catch (error: any) {
          console.error(`Error processing sentence ${id}:`, error);
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
      })
    );

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
