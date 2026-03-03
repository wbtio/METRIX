import { NextResponse } from 'next/server';
import { GeminiService, GeminiQuotaError } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { goal, answers, targetDeadline, structured_input } = await req.json();
        const result = await GeminiService.createPlan(goal, answers, targetDeadline, structured_input);
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
        return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }
}
