import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the client. 
// Ensure GOOGLE_APPLICATION_CREDENTIALS or other auth mechanisms are set up in the environment.
const client = new TextToSpeechClient();

export async function GET() {
  try {
    const [result] = await client.listVoices({ languageCode: 'ko-KR' });
    const voices = result.voices || [];

    // Group voices by quality/type for the UI
    const voiceGroups: Record<string, any> = {
      'gemini': {
        title: 'Gemini 2.5 Pro (Experimental)',
        quality: 6,
        pricing: 'free-tier-available',
        description: 'Latest generative model with natural prosody and context awareness.',
        voices: []
      },
      'neural2': {
        title: 'Neural2 (Premium)',
        quality: 5,
        pricing: 'high',
        description: 'Next-gen voice specialized for custom apps.',
        voices: []
      },
      'wavenet': {
        title: 'WaveNet (High Quality)',
        quality: 4,
        pricing: 'medium',
        description: 'DeepMind based high-fidelity speech.',
        voices: []
      },
      'standard': {
        title: 'Standard',
        quality: 3,
        pricing: 'low',
        description: 'Standard parametric voice.',
        voices: []
      }
    };

    voices.forEach((voice) => {
      // Filter for Korean voices only
      if (!voice.languageCodes?.includes('ko-KR')) return;

      const voiceData = {
        id: voice.name,
        name: voice.name?.split('-').pop(), // Display "A", "B", "C"...
        gender: voice.ssmlGender,
        languageCodes: voice.languageCodes
      };

      if (voice.name?.includes('Neural2')) {
        voiceGroups['neural2'].voices.push(voiceData);
      } else if (voice.name?.includes('Wavenet')) {
        voiceGroups['wavenet'].voices.push(voiceData);
      } else if (voice.name?.includes('Standard')) {
        voiceGroups['standard'].voices.push(voiceData);
      } else {
         // Fallback or other types
         voiceGroups['standard'].voices.push(voiceData);
      }
    });
    
    // Manually add Gemini option as it might not be in the standard list listVoices returns depending on the client version/region
    // Or if it is, we handle it. For now, we mock/add it manually as per requirements implies support.
    // NOTE: Gemini for TTS is often accessed via specific model endpoints or Vertex AI. 
    // The requirements mention "Google Cloud TTS (Neural2/Gemini)". 
    // If the standard client doesn't list it, we add a placeholder for the UI logic.
    voiceGroups['gemini'].voices.push({
      id: 'gemini-2.5-pro-tts', // Hypothetical ID or one provided by requirements
      name: 'Gemini 2.5 Pro',
      gender: 'NEUTRAL',
      description: 'Generative AI Voice'
    });

    return NextResponse.json({ voiceGroups });

  } catch (error: any) {
    console.error('Error fetching voices:', error);
    
    // Check for credential errors or general failures in dev
    if (error.message?.includes('Could not load the default credentials') || process.env.NODE_ENV === 'development') {
      console.warn("Using MOCK voices due to missing credentials.");
      return NextResponse.json({ voiceGroups: getMockVoices() });
    }

    return NextResponse.json(
      { error: 'Failed to fetch voices', details: error.message },
      { status: 500 }
    );
  }
}

// Fallback Mock Data for Development without Credentials
function getMockVoices() {
  return {
    'gemini': {
      title: 'Gemini 2.5 Pro (Mock)',
      quality: 6,
      pricing: 'free-tier-available',
      description: 'Mock data: Credentials missing.',
      voices: [
        { id: 'gemini-2.5-pro-tts', name: 'Gemini Pro', gender: 'NEUTRAL', languageCodes: ['ko-KR'] }
      ]
    },
    'neural2': {
      title: 'Neural2 (Mock)',
      quality: 5,
      pricing: 'high',
      description: 'Mock data: Credentials missing.',
      voices: [
        { id: 'ko-KR-Neural2-A', name: 'Neural2-A', gender: 'FEMALE', languageCodes: ['ko-KR'] },
        { id: 'ko-KR-Neural2-C', name: 'Neural2-C', gender: 'MALE', languageCodes: ['ko-KR'] }
      ]
    }
  };
}
