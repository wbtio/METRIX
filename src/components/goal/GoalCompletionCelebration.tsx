'use client';

import { useEffect, useState } from 'react';
import ConfettiBoom from 'react-confetti-boom';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { type Language } from '@/lib/translations';

interface GoalCompletionCelebrationProps {
    goalTitle: string;
    language?: Language;
    onClose: () => void;
}

export default function GoalCompletionCelebration({ goalTitle, language = 'en', onClose }: GoalCompletionCelebrationProps) {
    const isArabic = language === 'ar';
    const [visible, setVisible] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setShowConfetti(true), 100);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 350);
    };

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ animation: 'fadeIn 0.3s ease' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Confetti – fires from center top */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none flex justify-center">
                    <ConfettiBoom
                        mode="boom"
                        x={0.5}
                        y={0.3}
                        particleCount={200}
                        deg={270}
                        shapeSize={12}
                        spreadDeg={60}
                        launchSpeed={1.4}
                        colors={['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316']}
                    />
                </div>
            )}

            {/* Card */}
            <div
                className="relative z-10 bg-card border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
                style={{ animation: 'celebrationPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-primary/20 via-chart-5/20 to-chart-1/20 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/30" />

                    {/* Stars background */}
                    <Star className="absolute top-3 left-5 w-4 h-4 text-chart-5/40 animate-pulse" />
                    <Star className="absolute top-6 right-8 w-3 h-3 text-chart-1/40 animate-pulse delay-150" />
                    <Sparkles className="absolute bottom-4 left-8 w-4 h-4 text-primary/40 animate-pulse delay-300" />
                    <Sparkles className="absolute bottom-3 right-5 w-3 h-3 text-chart-5/40 animate-pulse delay-100" />

                    <div className="relative z-10">
                        <div
                            className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl"
                            style={{
                                background: 'linear-gradient(135deg, hsl(var(--chart-5)), hsl(var(--chart-1)))',
                                animation: 'trophyBounce 0.8s ease 0.3s both',
                            }}
                        >
                            <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
                        </div>

                        <h2
                            className="text-2xl font-black text-foreground mb-1"
                            dir={isArabic ? 'rtl' : 'ltr'}
                        >
                            {isArabic ? '🎉 هدف مكتمل!' : '🎉 Goal Completed!'}
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium" dir={isArabic ? 'rtl' : 'ltr'}>
                            {isArabic ? 'أنجزت ما بدأته — هذا ليس صغيراً.' : "You finished what you started — that's no small thing."}
                        </p>
                    </div>
                </div>

                {/* Goal name */}
                <div className="px-6 py-5 text-center" dir={isArabic ? 'rtl' : 'ltr'}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        {isArabic ? 'الهدف' : 'Goal'}
                    </p>
                    <p className="text-lg font-bold text-foreground leading-snug">{goalTitle}</p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={handleClose}
                        className="w-full py-4 rounded-2xl font-bold text-base text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, hsl(var(--chart-5)), hsl(var(--primary)))' }}
                    >
                        {isArabic ? 'رائع! شكراً' : 'Amazing! Keep Going 🚀'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes celebrationPop {
                    0%   { opacity: 0; transform: scale(0.7) translateY(40px); }
                    70%  { transform: scale(1.04) translateY(-4px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes trophyBounce {
                    0%   { opacity: 0; transform: scale(0.4) rotate(-15deg); }
                    60%  { transform: scale(1.15) rotate(5deg); }
                    100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
            `}</style>
        </div>
    );
}
