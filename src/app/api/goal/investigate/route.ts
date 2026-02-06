import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { goal, context } = await req.json();
        console.log("API investigate called with:", { goal, context });
        const result = await GeminiService.investigateGoal(goal, context);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API investigate error:", error);
        return NextResponse.json({ 
            error: 'Failed to investigate goal',
            details: error.message 
        }, { status: 500 });
    }
}
