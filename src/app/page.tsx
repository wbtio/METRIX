'use client';

import { useState, useEffect, useRef } from 'react';
// Components
import Dashboard from "../components/Dashboard";
import GoalsList from "@/components/GoalsList";
import HomePage from "@/components/HomePage";
import OrbitShell from '@/components/OrbitShell';
import OrbitDock from '@/components/OrbitDock';
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from '@/utils/supabase/client';
import { Loader2, Languages, Check } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';

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
}

export default function Home() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'settings' | 'goals'>('home');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [language, setLanguage] = useState<Language>('en');

  const t = translations[language];

  const supabase = createClient();

  useEffect(() => {
    fetchGoals();
    // Load language preference
    const savedLang = localStorage.getItem('language') as 'en' | 'ar' | null;
    if (savedLang) {
      setLanguage(savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', savedLang);
    }
  }, []);

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
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
    <OrbitShell>
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 pb-32 w-full max-w-7xl mx-auto">

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
            onGoalDeleted={() => {
              fetchGoals();
              if (selectedGoalId && !goals.find(g => g.id === selectedGoalId)) {
                setSelectedGoalId(null);
                setCurrentView('home');
              }
            }}
            language={language}
          />
        ) : currentView === 'settings' ? (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-card/30 backdrop-blur-xl p-8 rounded-[32px] border border-border ring-1 ring-border/5 shadow-2xl space-y-8">
              <div>
                <h2 className="text-3xl font-black text-foreground mb-2">{t.settings}</h2>
                <p className="text-sm text-muted-foreground">{t.settingsSubtitle}</p>
              </div>
              
              <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="p-5 bg-card/40 rounded-2xl border border-border hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold text-foreground mb-1">{t.appearance}</p>
                      <p className="text-sm text-muted-foreground">{t.appearanceDesc}</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                {/* Language Selector */}
                <div className="p-5 bg-card/40 rounded-2xl border border-border hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Languages className="w-4 h-4 text-primary" />
                        <p className="font-bold text-foreground">{t.language}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.languageDesc}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setLanguage('en');
                          localStorage.setItem('language', 'en');
                          document.documentElement.setAttribute('dir', 'ltr');
                          document.documentElement.setAttribute('lang', 'en');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          language === 'en'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {language === 'en' && <Check className="w-3 h-3 inline me-1" />}
                        {t.english}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('ar');
                          localStorage.setItem('language', 'ar');
                          document.documentElement.setAttribute('dir', 'rtl');
                          document.documentElement.setAttribute('lang', 'ar');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          language === 'ar'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {language === 'ar' && <Check className="w-3 h-3 inline me-1" />}
                        {t.arabic}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notifications - Coming Soon */}
                <div className="p-5 bg-muted/10 rounded-2xl border border-dashed border-border opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground mb-1">{t.notifications}</p>
                      <p className="text-sm text-muted-foreground">{t.notificationsDesc}</p>
                    </div>
                    <div className="w-10 h-6 bg-muted rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-muted-foreground rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="p-5 bg-card/40 rounded-2xl border border-border">
                  <p className="font-bold text-foreground mb-3">{t.account}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.status}:</span>
                      <span className="text-foreground font-medium">{t.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.goalsCreated}:</span>
                      <span className="text-foreground font-medium">{goals.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
