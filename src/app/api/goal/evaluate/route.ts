import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { tasks, log, previousLogs = [] } = await req.json();
        const result = await GeminiService.evaluateDailyLog(tasks, log, previousLogs);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to evaluate log' }, { status: 500 });
    }
}
