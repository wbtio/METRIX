import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const mistralApiKey = process.env.MISTRAL_API_KEY;
    
    if (!mistralApiKey) {
      console.warn('MISTRAL_API_KEY not found, using fallback transcription');
      return NextResponse.json({ 
        text: '',
        fallback: true,
        message: 'Mistral API key not configured. Please use browser speech recognition.'
      }, { status: 200 });
    }

    // Convert audio file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Call Mistral Voxtral API for transcription
    const language = formData.get('language') as string || 'ar';
    const mistralFormData = new FormData();
    const fileName = audioFile.name || 'recording.webm';
    mistralFormData.append('file', new Blob([audioBuffer], { type: audioFile.type }), fileName);
    mistralFormData.append('model', 'voxtral-mini-latest');
    mistralFormData.append('language', language);

    const mistralResponse = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
      },
      body: mistralFormData,
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Mistral API error:', errorText);
      return NextResponse.json({ 
        error: 'Transcription failed',
        details: errorText,
        fallback: true
      }, { status: mistralResponse.status });
    }

    const result = await mistralResponse.json();
    
    return NextResponse.json({
      text: result.text || '',
      language: result.language || 'ar',
      duration: result.duration,
      fallback: false
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      fallback: true
    }, { status: 500 });
  }
}
