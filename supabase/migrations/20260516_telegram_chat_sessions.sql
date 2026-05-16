CREATE TABLE IF NOT EXISTS telegram_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'active')),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    messages_today INTEGER NOT NULL DEFAULT 0,
    last_message_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_chat_sessions_user_chat
    ON telegram_chat_sessions(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_sessions_active
    ON telegram_chat_sessions(state) WHERE state = 'active';
