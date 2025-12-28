import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const promptText = text || "안녕하세요. 이것은 테스트 음성입니다.";

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    // Use the confirmed working model
    const modelName = 'gemini-2.5-flash-preview-tts';

    const result = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore" // Default Korean voice
            }
          }
        }
      }
    });

    // Extract audio data
    const candidate = result.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio'));
    const audioData = audioPart?.inlineData?.data;

    if (!audioData) {
      console.error("Gemini Response:", JSON.stringify(result, null, 2));
      return NextResponse.json({ error: 'No audio data received from Gemini' }, { status: 500 });
    }

    return NextResponse.json({ audioData });

  } catch (error: any) {
    console.error('Test TTS Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
