import { NextResponse } from 'next/server';
import { GeminiService, GeminiQuotaError } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { goal, context } = await req.json();
        console.log("API investigate called with:", { goal, context });
        const result = await GeminiService.investigateGoal(goal, context);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API investigate error:", error);
        if (error instanceof GeminiQuotaError) {
            return NextResponse.json({
                error: 'quota_exceeded',
                message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
                message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
                retryAfterSeconds: error.retryAfterSeconds
            }, { status: 429 });
        }
        return NextResponse.json({ error: 'Failed to investigate goal' }, { status: 500 });
    }
}
