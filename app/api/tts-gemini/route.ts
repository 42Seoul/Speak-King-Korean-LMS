import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Proven working configuration for Gemini TTS
const MODEL_NAME = 'gemini-2.5-flash-preview-tts';

export async function POST(req: Request) {
  try {
    const { text, voiceName } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    // Note: This model is strict. Do NOT add system instructions or complex prompts.
    // It takes the text and converts it to audio.
    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [{ text: text }]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || "Kore"
            }
          }
        }
      }
    });

    const candidate = result.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio'));
    const audioData = audioPart?.inlineData?.data;

    if (!audioData) {
      console.error("Gemini TTS Failed. Response:", JSON.stringify(result, null, 2));
      return NextResponse.json({ error: 'Failed to generate audio content' }, { status: 500 });
    }

    return NextResponse.json({ 
      audioData,
      model: MODEL_NAME
    });

  } catch (error: any) {
    console.error('Gemini TTS API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.toString()
    }, { status: 500 });
  }
}
