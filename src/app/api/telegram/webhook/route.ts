import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { processChatMessage } from '@/app/api/telegram/chat/route';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const BOT_MESSAGES = {
    startWithoutCode:
        'أهلاً بك في بوت METRIX.\n\nلربط تيليغرام بحسابك، افتح صفحة الإعدادات داخل METRIX واضغط "ربط تيليغرام".\n\nWelcome to METRIX Bot.\n\nTo link Telegram to your account, open METRIX Settings and tap "Connect Telegram".',
    invalidCode:
        'كود الربط غير صحيح أو منتهي.\n\nارجع إلى إعدادات METRIX واضغط "ربط تيليغرام" لإنشاء رابط جديد.\n\nInvalid or expired link code. Generate a new link from METRIX Settings.',
    usedCode:
        'هذا الرابط تم استخدامه سابقاً.\n\nإذا تحتاج تربط الحساب مرة ثانية، أنشئ رابط جديد من إعدادات METRIX.\n\nThis link was already used. Generate a new link from METRIX Settings if needed.',
    expiredCode:
        'انتهت صلاحية كود الربط.\n\nافتح إعدادات METRIX واضغط "ربط تيليغرام" مرة ثانية.\n\nThis link code expired. Please generate a new one from METRIX Settings.',
    linkFailed:
        'تعذر ربط حسابك الآن.\n\nحاول مرة ثانية من إعدادات METRIX.\n\nSomething went wrong while linking your account. Please try again from METRIX Settings.',
    linked:
        'تم ربط تيليغرام بحسابك في METRIX بنجاح.\n\nستصلك هنا تذكيرات الأهداف إذا لم تسجل تقدمك في الوقت المحدد.\n\nYour Telegram is now linked to your METRIX account.\n\nGoal reminders will arrive here when you miss your scheduled progress check-in.',
    commands:
        'الأوامر المتاحة:\n/start - ربط حساب METRIX\n/chat - دردشة مع AI عن هدفك\n/goals - عرض أهدافك\n/stop - إنهاء المحادثة\n\nAvailable commands:\n/start - Link your METRIX account\n/chat - Chat with AI about your goal\n/goals - List your goals\n/stop - End chat session',
};

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: object, useHtml = true) {
    if (!BOT_TOKEN) return;
    const body: Record<string, unknown> = {
        chat_id: chatId,
        text: useHtml ? text : escapeHtml(text),
    };
    if (useHtml) body.parse_mode = 'HTML';
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => 'unknown');
            console.error(`Telegram API error (${res.status}): ${errText.substring(0, 200)}`);
        }
    } catch (err) {
        console.error('Telegram sendMessage network error:', err);
    }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text || '',
            show_alert: false,
        }),
    });
}

async function editMessageText(chatId: number, messageId: number, text: string) {
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
        }),
    });
}

async function getUserByChatId(supabase: ReturnType<typeof createServiceRoleClient>, chatId: string) {
    const { data } = await supabase
        .from('user_settings')
        .select('user_id, language')
        .eq('telegram_chat_id', chatId)
        .maybeSingle();
    return data;
}

async function handleStart(supabase: ReturnType<typeof createServiceRoleClient>, chatId: number, text: string, username: string | null) {
    const parts = text.split(' ');
    const code = parts[1]?.trim();

    if (!code) {
        await sendTelegramMessage(chatId, BOT_MESSAGES.startWithoutCode);
        return;
    }

    const { data: linkCode, error: linkError } = await supabase
        .from('telegram_link_codes')
        .select('user_id, expires_at, used')
        .eq('code', code)
        .single();

    if (linkError || !linkCode) {
        console.error('Linking Error - Phase 1 (fetch link code):', linkError);
        await sendTelegramMessage(chatId, BOT_MESSAGES.invalidCode);
        return;
    }

    if (linkCode.used) {
        console.error('Linking Error - Phase 1b (code already used):', { code, user_id: linkCode.user_id });
        await sendTelegramMessage(chatId, BOT_MESSAGES.usedCode);
        return;
    }

    if (new Date(linkCode.expires_at) < new Date()) {
        console.error('Linking Error - Phase 1c (code expired):', { code, expires_at: linkCode.expires_at });
        await sendTelegramMessage(chatId, BOT_MESSAGES.expiredCode);
        return;
    }

    const { error: markUsedError } = await supabase
        .from('telegram_link_codes')
        .update({ used: true })
        .eq('code', code);

    if (markUsedError) {
        console.error('Linking Error - Phase 2 (mark code used):', markUsedError);
    }

    const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
            user_id: linkCode.user_id,
            telegram_chat_id: String(chatId),
            telegram_username: username,
            telegram_linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (upsertError) {
        console.error('Linking Error - Phase 3 (upsert user_settings):', upsertError);
        await sendTelegramMessage(chatId, BOT_MESSAGES.linkFailed);
        return;
    }

    try {
        await sendTelegramMessage(chatId, BOT_MESSAGES.linked);
    } catch (err) {
        console.error('Linking Error - Phase 4 (send confirmation):', err);
    }
}

async function handleChatCommand(supabase: ReturnType<typeof createServiceRoleClient>, chatId: number, userId: string, language: string) {
    const isArabic = language === 'ar';

    console.error('handleChatCommand — userId:', userId);

    const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, icon, status')
        .eq('user_id', userId)
        .in('status', ['active', 'investigating'])
        .order('created_at', { ascending: false })
        .limit(20);

    if (goalsError) {
        console.error('Fetch Goals Error:', goalsError);
    }

    if (!goals || goals.length === 0) {
        await sendTelegramMessage(
            chatId,
            isArabic
                ? 'ليس لديك أهداف نشطة حالياً. أنشئ هدفاً من تطبيق METRIX أولاً.'
                : 'You have no active goals. Create a goal in the METRIX app first.',
        );
        return;
    }

    const rows = [];
    for (let i = 0; i < goals.length; i += 2) {
        const row = [];
        row.push({
            text: `${goals[i].icon || '🎯'} ${goals[i].title.substring(0, 30)}`,
            callback_data: `chat_goal:${goals[i].id}`,
        });
        if (goals[i + 1]) {
            row.push({
                text: `${goals[i + 1].icon || '🎯'} ${goals[i + 1].title.substring(0, 30)}`,
                callback_data: `chat_goal:${goals[i + 1].id}`,
            });
        }
        rows.push(row);
    }

    rows.push([{
        text: isArabic ? '❌ إلغاء' : '❌ Cancel',
        callback_data: 'chat_cancel',
    }]);

    await sendTelegramMessage(
        chatId,
        isArabic
            ? 'اختر الهدف اللي تريد تتحدث عنه:'
            : 'Choose a goal to talk about:',
        { inline_keyboard: rows },
    );
}

async function handleCallbackQuery(cb: any, supabase: ReturnType<typeof createServiceRoleClient>) {
    const data = cb.data as string;
    const chatId = cb.message.chat.id;
    const msgId = cb.message.message_id;
    const cbId = cb.id;

    if (!data || !data.startsWith('chat_')) {
        await answerCallbackQuery(cbId);
        return;
    }

    if (data === 'chat_cancel') {
        await answerCallbackQuery(cbId);
        await editMessageText(chatId, msgId, '❌ ملغي / Cancelled');
        return;
    }

    if (data.startsWith('chat_goal:')) {
        const goalId = data.split(':')[1];
        const user = await getUserByChatId(supabase, String(chatId));

        if (!user) {
            await answerCallbackQuery(cbId, 'Account not linked');
            return;
        }

        const isArabic = user.language === 'ar';

        const { data: goal } = await supabase
            .from('goals')
            .select('title')
            .eq('id', goalId)
            .eq('user_id', user.user_id)
            .single();

        if (!goal) {
            await answerCallbackQuery(cbId, isArabic ? 'الهدف غير موجود' : 'Goal not found');
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        const { data: existing } = await supabase
            .from('telegram_chat_sessions')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('state', 'active')
            .maybeSingle();

        if (existing) {
            await supabase
                .from('telegram_chat_sessions')
                .update({ state: 'idle', updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        }

        const { error: insertError } = await supabase
            .from('telegram_chat_sessions')
            .insert({
                user_id: user.user_id,
                chat_id: String(chatId),
                goal_id: goalId,
                state: 'active',
                messages: '[]' as any,
                messages_today: 0,
                last_message_date: todayStr,
            });

        if (insertError) {
            console.error('Failed to insert chat session:', insertError);
            await answerCallbackQuery(cbId, isArabic ? 'خطأ في بدء المحادثة' : 'Failed to start chat');
            return;
        }

        await answerCallbackQuery(cbId, isArabic ? 'تم اختيار الهدف ✅' : 'Goal selected ✅');

        await editMessageText(
            chatId,
            msgId,
            isArabic
                ? `🎯 <b>${goal.title}</b>\n\nتم اختيار الهدف. أرسل أي سؤال متعلق بهدفك.\nعندك 10 رسائل اليوم.\n\nأرسل /stop لإنهاء المحادثة.`
                : `🎯 <b>${goal.title}</b>\n\nGoal selected. Send any question about your goal.\nYou have 10 messages today.\n\nSend /stop to end the chat.`,
        );
    }
}

export async function POST(req: Request) {
    try {
        const update = await req.json();
        const supabase = createServiceRoleClient();

        // Handle callback queries (goal selection buttons)
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, supabase);
            return NextResponse.json({ ok: true });
        }

        const message = update.message || update.edited_message;
        if (!message || !message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();
        const username = message.chat.username || null;

        // Handle /start — account linking
        if (text.startsWith('/start')) {
            await handleStart(supabase, chatId, text, username);
            return NextResponse.json({ ok: true });
        }

        // Find the user linked to this chat
        const user = await getUserByChatId(supabase, String(chatId));
        const isArabic = user?.language === 'ar';

        if (!user) {
            await sendTelegramMessage(
                chatId,
                '❌ حسابك غير مربوط. أرسل /start لربط حساب METRIX.\n\nYour account is not linked. Send /start to link your METRIX account.',
            );
            return NextResponse.json({ ok: true });
        }

        // Handle commands for linked users
        if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();

            if (command === '/chat' || command === '/khat') {
                await handleChatCommand(supabase, chatId, user.user_id, user.language);
                return NextResponse.json({ ok: true });
            }

            if (command === '/goals' || command === '/اهدافي') {
                const { data: goals } = await supabase
                    .from('goals')
                    .select('title, current_points, target_points, icon')
                    .eq('user_id', user.user_id)
                    .eq('status', 'active');

                if (!goals || goals.length === 0) {
                    await sendTelegramMessage(
                        chatId,
                        isArabic ? 'لا توجد أهداف نشطة.' : 'No active goals.',
                    );
                    return NextResponse.json({ ok: true });
                }

                const list = goals
                    .map((g, i) => `${i + 1}. ${g.icon || '🎯'} ${g.title} — ${g.current_points}/${g.target_points}`)
                    .join('\n');

                await sendTelegramMessage(
                    chatId,
                    isArabic
                        ? `📋 <b>أهدافك النشطة:</b>\n\n${list}\n\nأرسل /chat لبدء محادثة عن هدف.`
                        : `📋 <b>Your active goals:</b>\n\n${list}\n\nSend /chat to start talking about a goal.`,
                );
                return NextResponse.json({ ok: true });
            }

            if (command === '/stop' || command === '/end' || command === '/انهاء') {
                await supabase
                    .from('telegram_chat_sessions')
                    .update({ state: 'idle', updated_at: new Date().toISOString() })
                    .eq('user_id', user.user_id)
                    .eq('state', 'active');

                await sendTelegramMessage(
                    chatId,
                    isArabic ? 'تم إنهاء المحادثة. أرسل /chat لبدء محادثة جديدة.' : 'Chat ended. Send /chat to start a new conversation.',
                );
                return NextResponse.json({ ok: true });
            }

            // Unknown command
            await sendTelegramMessage(chatId, BOT_MESSAGES.commands);
            return NextResponse.json({ ok: true });
        }

        // Regular message — check if user has an active chat session
        const { data: activeSession } = await supabase
            .from('telegram_chat_sessions')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('state', 'active')
            .maybeSingle();

        if (!activeSession) {
            await sendTelegramMessage(
                chatId,
                isArabic
                    ? '📌 لا توجد محادثة نشطة. أرسل /chat لبدء محادثة.'
                    : '📌 No active chat. Send /chat to start a conversation.',
            );
            return NextResponse.json({ ok: true });
        }

        // Process via Gemini chat
        const result = await processChatMessage(supabase, String(chatId), text);

        if (!result.ok) {
            const fallback = isArabic ? 'حدث خطأ.' : 'An error occurred.';
            await sendTelegramMessage(chatId, result.response || fallback);
            return NextResponse.json({ ok: true });
        }

        if (!result.response) {
            console.error('processChatMessage returned ok=true but no response');
            await sendTelegramMessage(
                chatId,
                isArabic ? 'حدث خطأ. حاول مرة ثانية.' : 'An error occurred. Please try again.',
            );
            return NextResponse.json({ ok: true });
        }

        await sendTelegramMessage(chatId, result.response, undefined, false);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        return NextResponse.json({ ok: true });
    }
}
