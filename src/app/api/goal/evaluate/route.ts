import { NextResponse } from 'next/server';
import { GeminiService, GeminiQuotaError } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { tasks, log, previousLogs = [], goalContext = {} } = await req.json();
        const result = await GeminiService.evaluateDailyLog(tasks, log, previousLogs, goalContext);
        return NextResponse.json(result);
    } catch (error: any) {
        if (error instanceof GeminiQuotaError) {
            return NextResponse.json({
                error: 'quota_exceeded',
                message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
                message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
                retryAfterSeconds: error.retryAfterSeconds
            }, { status: 429 });
        }
        return NextResponse.json({ error: 'Failed to evaluate log' }, { status: 500 });
    }
}
