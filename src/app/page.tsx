'use client';

import { useState, useEffect } from 'react';
// Components
import Dashboard from "../components/Dashboard";
import GoalsList from "@/components/GoalsList";
import HomePage from "@/components/HomePage";
import OrbitShell from '@/components/OrbitShell';
import OrbitDock from '@/components/OrbitDock';
import SettingsPage from '@/components/SettingsPage';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import { useStreakReminder } from '@/hooks/useStreakReminder';
import type { User } from '@supabase/supabase-js';

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

export default function Home() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'settings' | 'goals'>('home');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);

  const t = translations[language];

  const supabase = createClient();

  // Background check for streaks at risk → browser notification
  useStreakReminder(language);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchGoals(user.id);
      }
    };

    initData();

    // Load language preference
    const savedLang = localStorage.getItem('language') as 'en' | 'ar' | null;
    if (savedLang) {
      setLanguage(savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', savedLang);
    }
  }, []);

  const fetchGoals = async (userId?: string) => {
    let currentUserId = userId;
    if (!currentUserId) {
      // If no ID passed, try getting from state or auth
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
      // Auto-select the most recent goal if exists
      if (data && data.length > 0 && !selectedGoalId) {
        setSelectedGoalId(data[0].id);
      }
    }
    setLoading(false);
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <OrbitShell user={user}>
      <div
        className={`flex-1 flex flex-col items-center p-3 sm:p-6 lg:p-12 w-full max-w-7xl mx-auto ${currentView === 'home'
          ? 'justify-start pt-4 sm:pt-8 lg:pt-10 pb-36 sm:pb-48'
          : 'justify-center pb-20 sm:pb-40'
          }`}
      >

        {loading ? (
          <div className="flex flex-col items-center justify-center animate-pulse gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-primary/50 font-medium tracking-widest text-sm">{t.loadingOrbit}</p>
          </div>
        ) : currentView === 'home' ? (
          <HomePage
            goals={goals}
            onGoalCreated={() => {
              fetchGoals();
              setTimeout(async () => {
                const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false }).limit(1);
                if (data && data[0]) {
                  setSelectedGoalId(data[0].id);
                  setCurrentView('dashboard');
                }
              }, 500);
            }}
            onSelectGoal={(id) => {
              setSelectedGoalId(id);
              setCurrentView('dashboard');
            }}
            language={language}
          />
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
          <SettingsPage
            language={language}
            setLanguage={setLanguage}
            goals={goals}
            onGoalsDeleted={() => {
              fetchGoals();
              setSelectedGoalId(null);
              setCurrentView('home');
            }}
          />
        ) : currentView === 'dashboard' && selectedGoal ? (
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-8 duration-700">
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
          setSelectedGoalId(id);
          setCurrentView('dashboard');
        }}
        activeTab={currentView}
        onTabChange={(tab) => setCurrentView(tab as 'home' | 'dashboard' | 'settings' | 'goals')}
        language={language}
      />
    </OrbitShell>
  );
}
