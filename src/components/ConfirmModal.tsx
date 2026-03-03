'use client';

import { translations, type Language } from '@/lib/translations';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  language?: Language;
  variant?: 'danger' | 'primary';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  language = 'en',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isArabic = language === 'ar';
  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-border"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        
        <div className="flex gap-2 p-4 bg-muted/30 border-t border-border">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            {t.cancel || (isArabic ? 'إلغاء' : 'Cancel')}
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors text-white ${
              variant === 'danger' 
                ? 'bg-destructive hover:bg-destructive/90 shadow-sm shadow-destructive/20' 
                : 'bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20'
            }`}
          >
            {isArabic ? 'تأكيد' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
