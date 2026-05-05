'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function WelcomeDialog() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [city, setCity] = useState('العراق');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingSolution, setIsSearchingSolution] = useState(false);
  const [supabase] = useState(() => createClient());
  const [isRejected, setIsRejected] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('metrix_welcome_seen');
    if (!hasSeenWelcome) {
      setIsVisible(true);
      // Disable background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isVisible) return null;

  const startAnalysis = () => {
    setStep(2);
    setIsLoading(false);
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3500); // 3.5 seconds of analysis for dramatic effect
  };

  const handleRequestLocation = () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      setCity('العراق');
      startAnalysis();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          // Try to get the most specific locality name possible
          const cityName = data.address?.city || data.address?.town || data.address?.state || data.address?.country || 'العراق';
          setCity(cityName);
        } catch (e) {
          console.error("Location fetching error:", e);
          setCity('العراق');
        } finally {
          startAnalysis();
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setCity('العراق');
        startAnalysis();
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleNextStep = () => {
    if (step === 3) {
      setStep(4);
      setIsSearchingSolution(true);
      setTimeout(() => {
        setIsSearchingSolution(false);
      }, 3500);
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleAccept = () => {
    localStorage.setItem('metrix_welcome_seen', 'true');
    setIsVisible(false);
    document.body.style.overflow = '';
  };

  const handleReject = () => {
    setIsRejected(true);
    setStep(5);
    
    // After 5 seconds of showing the harsh message, sign out
    setTimeout(async () => {
      await supabase.auth.signOut();
      // Reload to ensure state is clean and redirects to login
      window.location.href = '/';
    }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      {/* Premium Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl transition-opacity duration-500" />
      
      {/* Dialog Content */}
      <div 
        className={`relative w-full max-w-2xl overflow-hidden rounded-[var(--radius-2xl)] border ${isRejected ? 'border-destructive/50' : 'border-white/10'} bg-background/40 p-8 shadow-2xl backdrop-blur-md transition-all duration-700 animate-in fade-in zoom-in-95`}
      >
        <div className="flex flex-col items-center text-center">
          
          <div className="mb-8 h-12 w-48 relative animate-in fade-in duration-1000">
            <Image 
              src="/logo1.svg" 
              alt="METRIX Logo" 
              fill
              className="object-contain dark:hidden"
            />
            <Image 
              src="/logo2.svg" 
              alt="METRIX Logo" 
              fill
              className="object-contain hidden dark:block"
            />
          </div>

          <div className="min-h-[160px] flex flex-col justify-center w-full">
            {step === 1 && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl font-sans">
                  فحص النظام
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
                  يطلب النظام الوصول إلى إحداثيات موقعك الحالي لإتمام فحص البيئة المحيطة... هل تسمح بذلك؟
                </p>
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    onClick={handleRequestLocation}
                    disabled={isLoading}
                    className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isLoading ? 'جاري الاتصال...' : 'السماح والبدء'}
                  </button>
                  <button
                    onClick={() => {
                      setCity('العراق');
                      startAnalysis();
                    }}
                    disabled={isLoading}
                    className="rounded-lg border border-border px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:opacity-50"
                  >
                    الاستمرار بدون تحديد
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                <div className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  تمت المطابقة
                </div>
                <p className="text-base sm:text-lg text-foreground font-sans leading-relaxed">
                  تم تحديد الإحداثيات: <span className="font-bold text-primary">{city}</span>. جاري سحب بيانات النظام العام...
                </p>

                {isAnalyzing ? (
                  <div className="mt-8 flex flex-col items-center justify-center animate-in fade-in duration-500">
                     <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                     <p className="text-sm font-medium text-primary animate-pulse">جاري تحليل البيئة...</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <p className="mt-4 text-base sm:text-lg text-destructive font-sans leading-relaxed font-bold bg-destructive/10 inline-block px-4 py-2 rounded-lg border border-destructive/20">
                      النتيجة: أنت تعيش في بيئة مبنية على أسس هشة، ونظام معطل.
                    </p>
                    <div className="mt-8">
                      <button
                        onClick={handleNextStep}
                        className="rounded-lg bg-primary px-10 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-105"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                <p className="text-base sm:text-lg text-foreground font-sans leading-relaxed">
                  بيئة في <span className="font-bold text-primary">{city}</span> وفي هذا المجتمع تُقيّمك بشهادات ورقية ما تسوى قيمتها الحقيقية. مجتمع نجاحه يعتمد على المعارف والمحسوبيات (الواسطات) بدل الكفاءة والتعب. عالم مليء بالمظاهر المزيفة، والأشخاص اللي يتكلمون بالمثاليات وأفعالهم عكس ذلك تماماً.
                </p>
                <div className="mt-8">
                  <button
                    onClick={handleNextStep}
                    className="rounded-lg bg-primary px-10 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
                {isSearchingSolution ? (
                  <div className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-500">
                     <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                     <p className="text-base sm:text-lg font-medium text-primary animate-pulse">جاري البحث عن مسار بديل... تجاوز الأنظمة الفاسدة...</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <p className="text-base sm:text-lg text-foreground font-sans leading-relaxed mb-8">
                      الحل هو أن تبني نظامك الخاص بعيداً عن هاي الفوضى. هنا يجي دور METRIX. هذا التطبيق مو 'قائمة مهام' لطيفة تطبطب عليك؛ هذا مساحتك المعزولة. نظام ذكاء اصطناعي يقيمك بالمنطق والأرقام فقط. لا توجد هنا واسطات، ولا تهمنا أعذارك. الخيار أمامك: إما أن تبدأ ببناء واقعك الجديد بالأرقام والعمل، أو تبقى تشتكي من سوء البيئة.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button
                        onClick={handleAccept}
                        className="rounded-lg bg-primary px-8 py-3.5 text-sm font-bold tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] hover:scale-105"
                      >
                        الخروج من النظام وبناء واقعي
                      </button>
                      <button
                        onClick={handleReject}
                        className="rounded-lg border border-border px-8 py-3.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        البقاء والشكوى
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && isRejected && (
              <div className="animate-in slide-in-from-bottom-4 zoom-in-95 fade-in duration-500">
                <div className="mb-4 inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive animate-pulse">
                  فشل في النظام
                </div>
                <p className="text-base sm:text-lg text-destructive font-sans leading-relaxed font-bold">
                  تحليل القرار: اختيار المنطقة الآمنة. استمر في لوم 'الظروف' والواسطات والبيئة، بينما اخترت بنفسك الآن أن تكون جزءاً من الفشل الجماعي. الحقيقة دائماً ثقيلة، والبقاء كضحية أسهل بكثير من مواجهة الأرقام والالتزام. استمتع بالوعود الكاذبة التي تهرب إليها. النظام سيغلق الآن.. عُد عندما تملّ من كونك مجرد رقم عادي في نظام مكسور.
                </p>
                <div className="mt-8">
                  <div className="w-full bg-destructive/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-destructive h-full animate-[shrink_5s_linear_forwards]" style={{ transformOrigin: 'right' }} />
                  </div>
                </div>
                <style jsx>{`
                  @keyframes shrink {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                  }
                `}</style>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
