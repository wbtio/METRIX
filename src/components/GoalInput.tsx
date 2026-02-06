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
    placeholder = "ما هو هدفك القادم؟..."
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

    return (
        <div className={cn("w-full max-w-3xl mx-auto px-2 sm:px-4", className)}>
            <div
                className={cn(
                    "relative flex items-end gap-2 p-2 pl-3 transition-all duration-300 ease-out",
                    // Background & Blur
                    "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40",
                    // Border & Shape
                    "border border-muted-foreground/10 rounded-[28px]",
                    // Shadow - Soft & Deep
                    "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]",
                    // Focus State - Glow Effect
                    "focus-within:shadow-[0_8px_32px_-8px_rgba(var(--primary),0.15)] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10",
                    // Recording State
                    isRecording && "border-red-500/30 ring-4 ring-red-500/5 bg-red-500/5"
                )}
                dir="auto"
            >
                <textarea
                    ref={textareaRef}
                    dir="auto"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={isRecording ? "جارِ الاستماع..." : placeholder}
                    maxLength={maxLength}
                    rows={1}
                    disabled={isLoading}
                    className={cn(
                        "flex-1 min-h-[52px] max-h-[200px] py-3.5 bg-transparent border-none outline-none resize-none",
                        "text-base sm:text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/50",
                        "scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent",
                        isRecording && "placeholder:text-red-500/70 animate-pulse"
                    )}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (value.trim()) onSubmit();
                        }
                    }}
                />

                {/* Actions Container */}
                <div className="flex items-center gap-2 pb-1.5 pr-1 shrink-0">
                    
                    {/* Recording Button */}
                    <div className="relative">
                        {isRecording && (
                            <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 duration-1000" />
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRecording}
                            className={cn(
                                "h-10 w-10 rounded-full transition-all duration-300 relative z-10",
                                isRecording 
                                    ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            title={isRecording ? "إيقاف التسجيل" : "تحدث"}
                        >
                            {isRecording ? (
                                <StopCircle className="w-5 h-5 fill-current" />
                            ) : (
                                <Mic className="w-5 h-5" />
                            )}
                        </Button>
                    </div>

                    {/* Submit Button */}
                    <Button
                        size="icon"
                        onClick={onSubmit}
                        disabled={!value.trim() || isLoading}
                        className={cn(
                            "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                            value.trim() && !isLoading
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed scale-95"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Character Counter (Optional - visible only when typing) */}
            <div className={cn(
                "px-4 mt-2 flex justify-end text-[10px] font-medium text-muted-foreground transition-opacity duration-300",
                value.length > 0 ? "opacity-100" : "opacity-0"
            )}>
                <span>{value.length} / {maxLength}</span>
            </div>
        </div>
    );
}