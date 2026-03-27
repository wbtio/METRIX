'use client';

import { useState, useEffect, useCallback } from 'react';
// Components
import Dashboard from "@/components/dashboard/Dashboard";
import GoalsList from "@/components/goal/GoalsList";
import HomePage from "@/components/HomePage";
import GoalCreatorPage from "@/components/goal/GoalCreatorPage";
import ManualGoalCreator from "@/components/goal/ManualGoalCreator";
import OrbitShell from '@/components/OrbitShell';
import OrbitDock from '@/components/OrbitDock';
import SettingsPage from '@/components/settings/SettingsPage';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import { useStreakReminder } from '@/hooks/useStreakReminder';
import type { User } from '@supabase/supabase-js';

type AppView = 'home' | 'dashboard' | 'settings' | 'goals' | 'create-goal';

interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date: string;
  total_days: number;
  ai_summary: string;
  icon?: string;
  is_pinned?: boolean;
  user_id?: string;
}

interface PendingNavigation {
  view: AppView;
  selectedGoalId?: string | null;
}

export default function Home() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [createGoalMode, setCreateGoalMode] = useState<'ai' | 'manual'>('ai');
  const [createGoalText, setCreateGoalText] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  const [supabase] = useState(() => createClient());
  const [isAiGoalCreationGuardActive, setIsAiGoalCreationGuardActive] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  const t = translations[language];

  // Background check for streaks at risk → browser notification
  useStreakReminder(language);

  const fetchGoals = useCallback(async (userId?: string) => {
    let currentUserId = userId;
    if (!currentUserId) {
      if (user) {
        currentUserId = user.id;
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        currentUserId = authUser?.id;
      }
    }

    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUserId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setGoals(data || []);
      setSelectedGoalId((currentGoalId) => currentGoalId ?? (data && data.length > 0 ? data[0].id : null));
    }

    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchGoals(user.id);
      }
    };

    initData();
  }, [fetchGoals, supabase]);

  // Load persisted language from localStorage after hydration
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang === 'ar' || savedLang === 'en') {
      queueMicrotask(() => {
        setLanguage(savedLang);
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const resetAiGoalCreationState = useCallback(() => {
    setCreateGoalText('');
    setCreateGoalMode('ai');
    setIsAiGoalCreationGuardActive(false);
    setPendingNavigation(null);
  }, []);

  const executeNavigation = useCallback((navigation: PendingNavigation, options?: { discardAiDraft?: boolean }) => {
    if (options?.discardAiDraft) {
      resetAiGoalCreationState();
    }

    if (navigation.view === 'dashboard' && navigation.selectedGoalId !== undefined) {
      setSelectedGoalId(navigation.selectedGoalId);
    }

    setCurrentView(navigation.view);
  }, [resetAiGoalCreationState]);

  const requestNavigation = useCallback((navigation: PendingNavigation) => {
    const shouldGuardNavigation =
      currentView === 'create-goal' &&
      createGoalMode === 'ai' &&
      isAiGoalCreationGuardActive &&
      navigation.view !== 'create-goal';

    if (shouldGuardNavigation) {
      setPendingNavigation(navigation);
      return;
    }

    executeNavigation(navigation);
  }, [createGoalMode, currentView, executeNavigation, isAiGoalCreationGuardActive]);

  useEffect(() => {
    const shouldWarnBeforeUnload =
      currentView === 'create-goal' &&
      createGoalMode === 'ai' &&
      isAiGoalCreationGuardActive;

    if (!shouldWarnBeforeUnload) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [createGoalMode, currentView, isAiGoalCreationGuardActive]);

  const refetchUser = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
  };

  const handleGoalCreationComplete = useCallback(() => {
    fetchGoals();
    resetAiGoalCreationState();

    setTimeout(async () => {
      const { data } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data[0]) {
        setSelectedGoalId(data[0].id);
        setCurrentView('dashboard');
      } else {
        setCurrentView('home');
      }
    }, 500);
  }, [fetchGoals, resetAiGoalCreationState, supabase]);

  const handleConfirmPendingNavigation = useCallback(() => {
    if (!pendingNavigation) return;
    executeNavigation(pendingNavigation, { discardAiDraft: true });
  }, [executeNavigation, pendingNavigation]);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const shouldCenterMainContent =
    currentView === 'home' ||
    (currentView === 'goals' && goals.length === 0);

  return (
    <OrbitShell user={user}>
      <div
        className={`mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col items-center px-3 pt-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] transition-all duration-300 sm:px-6 sm:pt-6 sm:pb-28 lg:px-12 lg:pt-8 lg:pb-12 lg:pl-28 rtl:lg:pl-12 rtl:lg:pr-28
          ${shouldCenterMainContent ? 'justify-center' : 'justify-start'}`}
      >

        {loading ? (
          <div className="flex flex-col items-center justify-center animate-pulse gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-primary/50 font-medium tracking-widest text-sm">{t.loadingOrbit}</p>
          </div>
        ) : currentView === 'home' ? (
          <HomePage
            goals={goals}
            onSelectGoal={(id) => {
              setSelectedGoalId(id);
              setCurrentView('dashboard');
            }}
            onNavigateToCreate={(goalText, mode) => {
              setPendingNavigation(null);
              setIsAiGoalCreationGuardActive(false);
              setCreateGoalText(goalText);
              setCreateGoalMode(mode);
              setCurrentView('create-goal');
            }}
            language={language}
          />
        ) : currentView === 'create-goal' ? (
          <div className={`w-full ${createGoalMode === 'manual' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500`}>
            {createGoalMode === 'manual' ? (
              <ManualGoalCreator
                initialData={{ title: createGoalText }}
                language={language}
                onComplete={() => {
                  fetchGoals();
                  setCreateGoalText('');
                  setCreateGoalMode('ai');
                  setTimeout(async () => {
                    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false }).limit(1);
                    if (data && data[0]) {
                      setSelectedGoalId(data[0].id);
                      setCurrentView('dashboard');
                    } else {
                      setCurrentView('home');
                    }
                  }, 500);
                }}
                onCancel={() => {
                  setCreateGoalText('');
                  setCreateGoalMode('ai');
                  setIsAiGoalCreationGuardActive(false);
                  setCurrentView('home');
                }}
              />
            ) : (
              <GoalCreatorPage
                initialGoalText={createGoalText}
                language={language}
                onGuardStateChange={setIsAiGoalCreationGuardActive}
                onComplete={handleGoalCreationComplete}
                onCancel={() => requestNavigation({ view: 'home' })}
              />
            )}
          </div>
        ) : currentView === 'goals' ? (
          <GoalsList
            goals={goals}
            selectedGoalId={selectedGoalId}
            onSelectGoal={(id) => {
              setSelectedGoalId(id);
              setCurrentView('dashboard');
            }}
            onGoalChanged={() => {
              fetchGoals();
              if (selectedGoalId && !goals.find(g => g.id === selectedGoalId)) {
                setSelectedGoalId(null);
                setCurrentView('home');
              }
            }}
            language={language}
          />
        ) : currentView === 'settings' ? (
          <SettingsPage user={user}
            language={language}
            setLanguage={setLanguage}
            goals={goals}
            onProfileUpdated={refetchUser}
            onGoalsDeleted={() => {
              fetchGoals();
              setSelectedGoalId(null);
              setCurrentView('home');
            }}
          />
        ) : currentView === 'dashboard' && selectedGoal ? (
          <div className="w-full min-h-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Dashboard
              goal={selectedGoal}
              language={language}
              onGoalUpdated={fetchGoals}
            />
          </div>
        ) : null}

      </div>

      <OrbitDock
        goals={goals}
        selectedGoalId={selectedGoalId}
        onSelectGoal={(id) => {
          requestNavigation({ view: 'dashboard', selectedGoalId: id });
        }}
        activeTab={currentView}
        onTabChange={(tab) => requestNavigation({ view: tab as AppView })}
        language={language}
      />

      <ConfirmModal
        isOpen={!!pendingNavigation}
        title={t.leaveGoalCreationTitle}
        message={t.leaveGoalCreationMessage}
        confirmLabel={t.leaveGoalCreation}
        cancelLabel={t.stayOnGoalCreation}
        variant="danger"
        language={language}
        onConfirm={handleConfirmPendingNavigation}
        onCancel={() => setPendingNavigation(null)}
      />
    </OrbitShell>
  );
}
