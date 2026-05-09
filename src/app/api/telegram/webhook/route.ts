import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';

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
        'الأوامر المتاحة:\n/start - ربط حساب METRIX\n\nAvailable commands:\n/start - Link your METRIX account',
};

async function sendTelegramMessage(chatId: number, text: string) {
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        }),
    });
}

export async function POST(req: Request) {
    try {
        const update = await req.json();
        const message = update.message || update.edited_message;

        if (!message || !message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();
        const username = message.chat.username || null;

        // Handle /start <code>
        if (text.startsWith('/start')) {
            const parts = text.split(' ');
            const code = parts[1]?.trim();

            if (!code) {
                await sendTelegramMessage(chatId, BOT_MESSAGES.startWithoutCode);
                return NextResponse.json({ ok: true });
            }

            const supabase = createServiceRoleClient();

            // Validate link code
            const { data: linkCode, error: linkError } = await supabase
                .from('telegram_link_codes')
                .select('user_id, expires_at, used')
                .eq('code', code)
                .single();

            if (linkError || !linkCode) {
                await sendTelegramMessage(chatId, BOT_MESSAGES.invalidCode);
                return NextResponse.json({ ok: true });
            }

            if (linkCode.used) {
                await sendTelegramMessage(chatId, BOT_MESSAGES.usedCode);
                return NextResponse.json({ ok: true });
            }

            if (new Date(linkCode.expires_at) < new Date()) {
                await sendTelegramMessage(chatId, BOT_MESSAGES.expiredCode);
                return NextResponse.json({ ok: true });
            }

            // Mark code as used
            await supabase
                .from('telegram_link_codes')
                .update({ used: true })
                .eq('code', code);

            // Upsert user settings with telegram chat id
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
                console.error('Webhook upsert error:', upsertError);
                await sendTelegramMessage(chatId, BOT_MESSAGES.linkFailed);
                return NextResponse.json({ ok: true });
            }

            await sendTelegramMessage(chatId, BOT_MESSAGES.linked);
            return NextResponse.json({ ok: true });
        }

        // Handle unknown commands
        if (text.startsWith('/')) {
            await sendTelegramMessage(chatId, BOT_MESSAGES.commands);
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        return NextResponse.json({ ok: true });
    }
}
