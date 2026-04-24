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
import { getLocalDateKey, getLocalWeekStartMonday } from '@/lib/task-periods';
import { useStreakReminder } from '@/hooks/useStreakReminder';
import type { User } from '@supabase/supabase-js';

type AppView = 'home' | 'dashboard' | 'settings' | 'goals' | 'create-goal';

export interface GoalTaskStats {
  completed: number;
  total: number;
}

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
  const [taskStatsMap, setTaskStatsMap] = useState<Record<string, GoalTaskStats>>({});
  const [isAiGoalCreationGuardActive, setIsAiGoalCreationGuardActive] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  const t = translations[language];

  // Background check for streaks at risk → browser notification
  useStreakReminder(language);

  const fetchTaskStats = useCallback(async (goalIds: string[]) => {
    if (goalIds.length === 0) { setTaskStatsMap({}); return; }

    const todayKey = getLocalDateKey();
    const weekKey = getLocalWeekStartMonday();

    const [{ data: tasks }, { data: checkins }] = await Promise.all([
      supabase
        .from('sub_layers')
        .select('id, goal_id, frequency')
        .in('goal_id', goalIds),
      supabase
        .from('task_checkins')
        .select('task_id, goal_id')
        .eq('completed', true)
        .in('goal_id', goalIds)
        .in('period_start', [todayKey, weekKey]),
    ]);

    const completedSet = new Set(checkins?.map(c => c.task_id) || []);
    const statsMap: Record<string, GoalTaskStats> = {};

    for (const task of tasks || []) {
      if (!statsMap[task.goal_id]) statsMap[task.goal_id] = { completed: 0, total: 0 };
      statsMap[task.goal_id].total++;
      if (completedSet.has(task.id)) statsMap[task.goal_id].completed++;
    }

    setTaskStatsMap(statsMap);
  }, [supabase]);

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
      fetchTaskStats((data || []).map(g => g.id));
    }

    setLoading(false);
  }, [supabase, user, fetchTaskStats]);

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
    currentView === 'goals';
  const isDashboardView = currentView === 'dashboard' && !!selectedGoal;

  return (
    <OrbitShell user={user}>
      <div
        className={`mx-auto flex min-h-0 w-full max-w-7xl 2xl:max-w-[1600px] flex-col items-center px-3 pt-3 transition-all duration-300 sm:px-6 sm:pt-6 lg:px-12 lg:pt-8 lg:pl-28 rtl:lg:pl-12 rtl:lg:pr-28
          ${isDashboardView
            ? 'h-[calc(100dvh_-_5.75rem_-_env(safe-area-inset-bottom))] shrink-0 overflow-hidden pb-0 sm:h-[calc(100dvh_-_7rem)] lg:h-[100dvh] lg:pb-12'
            : 'flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:pb-28 lg:pb-12'}
          ${shouldCenterMainContent && !isDashboardView ? 'justify-center' : 'justify-start'}`}
      >

        {loading ? (
          <div className="flex flex-col items-center justify-center animate-pulse gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-primary/50 font-medium tracking-widest text-sm">{t.loadingOrbit}</p>
          </div>
        ) : currentView === 'home' ? (
          <HomePage
            goals={goals}
            taskStatsMap={taskStatsMap}
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
            taskStatsMap={taskStatsMap}
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
          <div className="flex min-h-0 w-full flex-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
