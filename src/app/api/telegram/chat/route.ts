import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { GeminiService } from '@/lib/gemini';

const DAILY_MESSAGE_LIMIT = 10;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const chatId = body.chatId;
        const message = body.message;

        if (!chatId || !message) {
            return NextResponse.json(
                { error: 'chatId and message are required' },
                { status: 400 },
            );
        }

        const supabase = createServiceRoleClient();
        const result = await processChatMessage(supabase, String(chatId), String(message));
        return NextResponse.json(result);
    } catch (error) {
        console.error('Telegram chat error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function processChatMessage(
    supabase: ReturnType<typeof createServiceRoleClient>,
    chatId: string,
    message: string,
): Promise<{ ok: boolean; response?: string; reason?: string }> {
    const { data: settings } = await supabase
        .from('user_settings')
        .select('user_id, language')
        .eq('telegram_chat_id', chatId)
        .maybeSingle();

    if (!settings) {
        return { ok: false, reason: 'not_linked' };
    }

    const language = (settings.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';

    const { data: session } = await supabase
        .from('telegram_chat_sessions')
        .select('*')
        .eq('user_id', settings.user_id)
        .eq('state', 'active')
        .maybeSingle();

    if (!session) {
        return {
            ok: false,
            reason: 'no_active_session',
            response: language === 'ar'
                ? 'لا توجد محادثة نشطة. أرسل /chat لبدء محادثة جديدة.'
                : 'No active chat. Send /chat to start a new conversation.',
        };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let messagesToday = session.messages_today;
    if (session.last_message_date !== todayStr) {
        messagesToday = 0;
    }

    if (messagesToday >= DAILY_MESSAGE_LIMIT) {
        return {
            ok: false,
            reason: 'daily_limit',
            response: language === 'ar'
                ? `وصلت للحد اليومي (${DAILY_MESSAGE_LIMIT} رسائل). عد غداً ✋`
                : `Daily limit reached (${DAILY_MESSAGE_LIMIT} messages). Come back tomorrow ✋`,
        };
    }

    const { data: goal } = await supabase
        .from('goals')
        .select('title, ai_summary, created_at, current_points, target_points')
        .eq('id', session.goal_id)
        .single();

    if (!goal) {
        return { ok: false, reason: 'goal_not_found' };
    }

    const messages = (session.messages as ChatMessage[]) || [];

    const response = await GeminiService.chatAboutGoal(
        goal,
        language,
        messages,
        message,
    );

    const updatedMessages: ChatMessage[] = [
        ...messages,
        { role: 'user', content: message },
        { role: 'assistant', content: response },
    ];

    const trimmedMessages = updatedMessages.slice(-6);

    const { error: updateError } = await supabase
        .from('telegram_chat_sessions')
        .update({
            messages: JSON.stringify(trimmedMessages),
            messages_today: messagesToday + 1,
            last_message_date: todayStr,
            updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

    if (updateError) {
        console.error('Failed to update chat session:', updateError);
    }

    const remainingAfter = DAILY_MESSAGE_LIMIT - (messagesToday + 1);
    let finalResponse = response;

    if (remainingAfter > 0 && remainingAfter <= 2) {
        const note = language === 'ar'
            ? `\n\n⚠️ ملاحظة: باقي لك ${remainingAfter} ${remainingAfter === 1 ? 'رسالة' : 'رسالتين'} لليوم.`
            : `\n\n⚠️ Note: You have ${remainingAfter} message${remainingAfter === 1 ? '' : 's'} left today.`;
        finalResponse += note;
    }

    return { ok: true, response: finalResponse };
}
