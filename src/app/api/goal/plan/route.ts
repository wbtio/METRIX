import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { goal, answers, targetDeadline } = await req.json();
        const result = await GeminiService.createPlan(goal, answers, targetDeadline);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }
}
