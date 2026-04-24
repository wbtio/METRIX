export const TASK_EMOJI_CATEGORIES = [
  {
    key: 'core',
    icon: '🎯',
    labelEn: 'Goals',
    labelAr: 'الأهداف',
    emojis: ['🎯', '⚡', '🔥', '🚀', '✅', '⭐', '🏆', '💎', '📌', '🧭', '🏁', '⛰️', '🧗', '🔒', '🔑', '🛡️'],
  },
  {
    key: 'faces',
    icon: '😀',
    labelEn: 'Faces',
    labelAr: 'الوجوه',
    emojis: ['😀', '😄', '😁', '😊', '🙂', '😎', '🤓', '🧐', '😌', '😤', '😮‍💨', '🤯', '🥳', '🤩', '😇', '😴'],
  },
  {
    key: 'hands',
    icon: '🙌',
    labelEn: 'Hands',
    labelAr: 'الأيدي',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '🙌', '👏', '💪', '🫡', '🙏', '✍️', '🫶', '☝️', '👉', '👈'],
  },
  {
    key: 'mind',
    icon: '🧠',
    labelEn: 'Mind',
    labelAr: 'العقل',
    emojis: ['🧠', '💡', '📚', '📖', '📝', '✍️', '📒', '🗒️', '📐', '🧮', '🔬', '🧪', '💻', '🗂️', '📊', '📈'],
  },
  {
    key: 'body',
    icon: '💪',
    labelEn: 'Body',
    labelAr: 'الجسم',
    emojis: ['💪', '🏃‍♂️', '🏋️‍♂️', '🚴‍♂️', '🧘‍♂️', '🥗', '🍎', '🥑', '💧', '☕', '💤', '🛌', '🫀', '🫁', '🦷', '🚿'],
  },
  {
    key: 'work',
    icon: '💻',
    labelEn: 'Work',
    labelAr: 'العمل',
    emojis: ['💻', '📱', '🎬', '🎧', '🎙️', '📷', '🎨', '🖌️', '🛠️', '⚙️', '💼', '💰', '🧾', '🛒', '📦', '📣', '💬'],
  },
  {
    key: 'habits',
    icon: '🕒',
    labelEn: 'Habits',
    labelAr: 'العادات',
    emojis: ['🕒', '⏰', '⏳', '📅', '🗓️', '🔁', '📍', '🧱', '🧩', '🧹', '🧺', '🧼', '☑️', '✔️', '✅', '📌'],
  },
  {
    key: 'life',
    icon: '🏠',
    labelEn: 'Life',
    labelAr: 'الحياة',
    emojis: ['👥', '🗣️', '💬', '❤️', '🫶', '🤝', '🎁', '🏠', '🚗', '✈️', '🕌', '🙏', '🌙', '🕋', '☀️', '🌱'],
  },
  {
    key: 'metrics',
    icon: '📊',
    labelEn: 'Metrics',
    labelAr: 'القياس',
    emojis: ['📈', '📉', '📊', '🧮', '🔢', '💯', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🔥', '💎', '✅'],
  },
  {
    key: 'energy',
    icon: '🌱',
    labelEn: 'Energy',
    labelAr: 'الطاقة',
    emojis: ['🌱', '🌿', '🪴', '☀️', '🌙', '🌟', '💧', '🌊', '⛰️', '⚡', '🔥', '🧊', '🍃', '🌻', '🌈', '🕯️'],
  },
] as const;

export type TaskEmojiCategoryKey = (typeof TASK_EMOJI_CATEGORIES)[number]['key'];

export const TASK_EMOJI_OPTIONS = Array.from(
  new Set(TASK_EMOJI_CATEGORIES.flatMap((category) => category.emojis)),
);

export function getTaskEmojiCategoryKey(emoji?: string | null): TaskEmojiCategoryKey {
  const normalized = emoji?.trim();
  const matchingCategory = TASK_EMOJI_CATEGORIES.find(
    (category) => normalized && (category.emojis as readonly string[]).includes(normalized),
  );

  return matchingCategory?.key ?? TASK_EMOJI_CATEGORIES[0].key;
}

export function getTaskEmojiOptions(
  categoryKey: TaskEmojiCategoryKey,
  activeEmoji?: string | null,
): string[] {
  const category =
    TASK_EMOJI_CATEGORIES.find((item) => item.key === categoryKey) ?? TASK_EMOJI_CATEGORIES[0];
  const options = [...category.emojis] as string[];
  const normalizedActiveEmoji = activeEmoji?.trim();

  if (normalizedActiveEmoji && !options.includes(normalizedActiveEmoji)) {
    return [normalizedActiveEmoji, ...options];
  }

  return options;
}
