import { NextResponse } from 'next/server';

// Gemini TTS Voice Data
// Based on Gemini 2.5 TTS documentation: 30+ voices across 24 languages
// All voices support multiple languages including Korean (ko-KR)

export async function GET() {
  try {
    // Gemini TTS voices with characteristics
    const voiceGroups: Record<string, any> = {
      'gemini-premium': {
        title: 'Gemini Premium Voices',
        quality: 5,
        pricing: 'premium',
        description: 'Natural, expressive voices with advanced control.',
        voices: [
          {
            id: 'Kore',
            name: 'Kore',
            gender: 'FEMALE',
            languageCodes: ['ko-KR'],
            description: 'Bright and clear female voice'
          },
          {
            id: 'Puck',
            name: 'Puck',
            gender: 'MALE',
            languageCodes: ['ko-KR'],
            description: 'Warm and friendly male voice'
          },
          {
            id: 'Charon',
            name: 'Charon',
            gender: 'MALE',
            languageCodes: ['ko-KR'],
            description: 'Deep and authoritative male voice'
          },
          {
            id: 'Kore-en',
            name: 'Kore (Bilingual)',
            gender: 'FEMALE',
            languageCodes: ['ko-KR', 'en-US'],
            description: 'Bright female voice with English support'
          }
        ]
      },
      'gemini-standard': {
        title: 'Gemini Standard Voices',
        quality: 4,
        pricing: 'standard',
        description: 'High-quality natural voices for everyday use.',
        voices: [
          {
            id: 'Aoede',
            name: 'Aoede',
            gender: 'FEMALE',
            languageCodes: ['ko-KR'],
            description: 'Conversational female voice'
          },
          {
            id: 'Fenrir',
            name: 'Fenrir',
            gender: 'MALE',
            languageCodes: ['ko-KR'],
            description: 'Professional male voice'
          },
          {
            id: 'Orbit',
            name: 'Orbit',
            gender: 'NEUTRAL',
            languageCodes: ['ko-KR'],
            description: 'Neutral, informative voice'
          }
        ]
      }
    };

    return NextResponse.json({ voiceGroups });

  } catch (error: any) {
    console.error('Error fetching voices:', error);

    return NextResponse.json(
      { error: 'Failed to fetch voices', details: error.message },
      { status: 500 }
    );
  }
}
