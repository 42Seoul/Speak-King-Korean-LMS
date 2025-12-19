import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient();

export async function POST(req: Request) {
  try {
    const { voiceId, previewText } = await req.json();

    if (!voiceId || !previewText) {
      return NextResponse.json({ error: 'Missing voiceId or previewText' }, { status: 400 });
    }

    const request: any = {
      input: { text: previewText },
      voice: {
        languageCode: 'ko-KR',
        name: voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }

    const audioData = Buffer.from(response.audioContent).toString('base64');

    return NextResponse.json({ audioData });

  } catch (error: any) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
