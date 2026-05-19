'use client';

import { MatrixManifestoDialog } from '@/components/login/MatrixManifestoDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const MANIFESTO_STORAGE_KEY = 'metrix-login-manifesto-seen';

type EmailAuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isManifestoOpen, setIsManifestoOpen] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/');
      } else {
        if (!window.localStorage.getItem(MANIFESTO_STORAGE_KEY)) {
          window.localStorage.setItem(MANIFESTO_STORAGE_KEY, 'true');
          setIsManifestoOpen(true);
        }
        setLoading(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error logging in:', error.message);
    }
  };

  const redirectAfterAuth = () => {
    router.push('/');
    router.refresh();
  };

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailAuthError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setEmailAuthError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (password.length < 6) {
      setEmailAuthError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setEmailAuthLoading(true);

    try {
      if (emailAuthMode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setEmailAuthError(signUpError.message);
          return;
        }

        if (signUpData.session) {
          redirectAfterAuth();
          return;
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          setEmailAuthError(
            'تم إنشاء الحساب. إذا كان تأكيد البريد مفعّلاً في Supabase، افتح رابط التأكيد ثم سجّل الدخول.'
          );
          return;
        }

        if (signInData.session) {
          redirectAfterAuth();
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setEmailAuthError(
          error.message.includes('Invalid login credentials')
            ? 'البريد أو كلمة المرور غير صحيحة'
            : error.message
        );
        return;
      }

      if (data.session) {
        redirectAfterAuth();
      }
    } finally {
      setEmailAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center justify-center animate-pulse gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4"
    >
      <MatrixManifestoDialog
        open={isManifestoOpen}
        onOpenChange={setIsManifestoOpen}
      />

      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/logo1.svg"
              alt="Metrix Logo"
              width={180}
              height={180}
              sizes="(max-width: 640px) 192px, 208px"
              priority
              className="h-auto w-48 sm:w-52 dark:hidden"
              style={{ height: 'auto' }}
            />
            <Image
              src="/logo2.svg"
              alt="Metrix Logo Dark"
              width={180}
              height={180}
              sizes="(max-width: 640px) 192px, 208px"
              priority
              className="hidden h-auto w-48 sm:w-52 dark:block"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-xl border-2 border-gray-200 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>تسجيل الدخول باستخدام جوجل</span>
            </button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">أو</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <section
              aria-labelledby="temp-email-auth-heading"
              className="space-y-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="temp-email-auth-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  بريد إلكتروني وكلمة مرور
                </h2>
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  مؤقت
                </span>
              </div>

              <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailAuthMode('signin');
                    setEmailAuthError(null);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                    emailAuthMode === 'signin'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailAuthMode('signup');
                    setEmailAuthError(null);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                    emailAuthMode === 'signup'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  إنشاء حساب
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">البريد الإلكتروني</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    className="text-start"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailAuthLoading}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">كلمة المرور</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete={
                      emailAuthMode === 'signup' ? 'new-password' : 'current-password'
                    }
                    dir="ltr"
                    className="text-start"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={emailAuthLoading}
                    minLength={6}
                    required
                  />
                </div>

                {emailAuthError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {emailAuthError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={emailAuthLoading}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailAuthLoading
                    ? 'جاري المعالجة...'
                    : emailAuthMode === 'signup'
                      ? 'إنشاء حساب في قاعدة البيانات'
                      : 'تسجيل الدخول'}
                </button>
              </form>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                الحساب يُنشأ في Supabase Auth (قاعدة البيانات) بنفس طريقة حساب جوجل.
              </p>
            </section>

            <button
              type="button"
              onClick={() => setIsManifestoOpen(true)}
              className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              القصة وراء ماتريكس
            </button>

            <p className="text-xs text-center text-muted-foreground">
              بتسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
