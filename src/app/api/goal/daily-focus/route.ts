import { NextResponse } from 'next/server';
import { GeminiQuotaError, GeminiService } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const {
      goal,
      tasks = [],
      logs = [],
      history = [],
      answer,
      existingQuestion,
      date,
    } = await req.json();

    const result = await GeminiService.generateDailyFocus(
      goal,
      tasks,
      logs,
      { answer, existingQuestion, date, history },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
          message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate daily focus' },
      { status: 500 },
    );
  }
}
