'use client';

import { useRef, useEffect } from 'react';
import { Mic, ArrowUp, Loader2, StopCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoalInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isRecording: boolean;
    onToggleRecording: () => void;
    isLoading: boolean;
    className?: string;
    maxLength?: number;
    placeholder?: string;
    language?: 'ar' | 'en';
}

export default function GoalInput({
    value,
    onChange,
    onSubmit,
    isRecording,
    onToggleRecording,
    isLoading,
    className,
    maxLength = 1000,
    placeholder = "ما هو هدفك القادم؟...",
    language = 'ar'
}: GoalInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize logic
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.max(52, Math.min(textarea.scrollHeight, 200));
            textarea.style.height = `${newHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    const isArabic = language === 'ar';

    return (
        <div className={cn("w-full max-w-3xl mx-auto", className)}>
            <div
                className={cn(
                    "relative flex items-center gap-2.5 p-2.5 transition-all duration-200",
                    "bg-background/95 backdrop-blur-sm",
                    "border border-border rounded-[20px]",
                    "shadow-sm",
                    "focus-within:border-primary/40 focus-within:shadow-md",
                    isRecording && "border-red-500/30 bg-red-50/5"
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <textarea
                    ref={textareaRef}
                    dir="auto"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={isRecording ? (isArabic ? "جارِ الاستماع..." : "Listening...") : placeholder}
                    maxLength={maxLength}
                    rows={1}
                    disabled={isLoading}
                    className={cn(
                        "flex-1 min-h-[44px] max-h-[200px] py-2.5 bg-transparent border-none outline-none resize-none",
                        "text-sm sm:text-base font-medium leading-relaxed text-foreground placeholder:text-muted-foreground/50",
                        "scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent",
                        isRecording && "placeholder:text-red-500/60",
                        "px-3"
                    )}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (value.trim()) onSubmit();
                        }
                    }}
                />

                {/* Actions Container */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Voice Recording Button with subtle animation */}
                    <button
                        onClick={onToggleRecording}
                        disabled={isLoading}
                        className={cn(
                            "relative px-3 h-9 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5",
                            "text-xs font-medium",
                            isRecording 
                                ? "bg-red-50 text-red-600 hover:bg-red-100" 
                                : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        title={isRecording ? (isArabic ? "إيقاف التسجيل" : "Stop Recording") : (isArabic ? "تحدث" : "Speak")}
                    >
                        {isRecording && (
                            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                        )}
                        {isRecording ? (
                            <StopCircle className="w-3.5 h-3.5 fill-current relative z-10" />
                        ) : (
                            <Mic className="w-3.5 h-3.5 relative z-10" />
                        )}
                        <span className="relative z-10 hidden sm:inline">
                            {isRecording 
                                ? (isArabic ? "إيقاف" : "Stop") 
                                : (isArabic ? "صوت" : "Voice")}
                        </span>
                    </button>

                    {/* Submit Button */}
                    <button
                        onClick={onSubmit}
                        disabled={!value.trim() || isLoading}
                        className={cn(
                            "px-3 h-9 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5",
                            "text-xs font-medium",
                            value.trim() && !isLoading
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                        )}
                        title={isArabic ? "إنشاء" : "Submit"}
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span className="hidden sm:inline">
                            {isArabic ? "إنشاء" : "Submit"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Character Counter (Optional - visible only when typing) */}
            <div className={cn(
                "px-4 mt-2 flex text-[10px] font-medium text-muted-foreground transition-opacity duration-300",
                isArabic ? "justify-start" : "justify-end",
                value.length > 0 ? "opacity-100" : "opacity-0"
            )}>
                <span>{value.length} / {maxLength}</span>
            </div>
        </div>
    );
}