'use client';

import { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  Calendar, 
  Target, 
  Lightbulb, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Medal,
  ArrowRight,
  CheckCircle2,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
// افترض أن ملف الترجمة موجود كما هو
import { translations, type Language } from '@/lib/translations';

interface WeeklySummary {
  completed_count: number;
  total_points: number;
  best_day: string | null;
  best_activity: string | null;
  patterns: string[];
  improvements: string[];
  next_week_plan: { task: string; frequency: string }[];
  coach_message: string;
}

interface WeeklySummaryCardProps {
  goalId: string;
  language?: Language;
}

export default function WeeklySummaryCard({ goalId, language = 'en' }: WeeklySummaryCardProps) {
  // تحديد الاتجاه تلقائياً: إذا عربي (rtl) وإلا (ltr)
  // هذا السطر هو المسؤول عن قلب التصميم كاملاً بشكل سحري
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, forceRefresh }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      console.error('Error loading summary:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (goalId) loadSummary();
    setIsOpen(false);
  }, [goalId]);

  const getWeekRange = () => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; 
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  const weekRange = getWeekRange();

  // Loading State
  if (loading && !data) {
    return (
      <Card className="w-full rounded-3xl border-border/40 shadow-sm bg-card/50" dir={direction}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
             <Skeleton className="h-20 w-full rounded-2xl" />
             <Skeleton className="h-20 w-full rounded-2xl" />
             <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <Card className="w-full rounded-3xl border-destructive/20 bg-destructive/5" dir={direction}>
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <p className="text-destructive mb-4 font-medium">
            {language === 'ar' ? 'عذراً، حدث خطأ أثناء جلب الملخص' : 'Failed to load summary'}
          </p>
          <Button variant="outline" size="sm" onClick={() => loadSummary()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div 
      className="bg-card/30 backdrop-blur-xl rounded-2xl border border-border shadow-lg overflow-hidden"
      dir={direction}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Compact Header - Same style as AdvancedAnalytics */}
        <div className={cn("px-4 py-3 border-b border-border/40 bg-card/20 transition-all", isOpen && "pb-3")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="shrink-0 w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">
                  {language === 'ar' ? 'ملخص الأسبوع' : 'Weekly Summary'}
                </h3>
                {!isOpen && data && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-chart-2">
                      {data.completed_count} {language === 'ar' ? 'نشاط' : 'activities'}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium text-primary">
                      {data.total_points} {language === 'ar' ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); loadSummary(true); }}
                disabled={loading}
                className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </Button>
              <CollapsibleTrigger asChild>
                <button className="shrink-0 p-1.5 hover:bg-muted rounded-lg transition-colors">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
            
            {/* Coach Message Section */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-card/80 border border-primary/10 rounded-2xl p-5">
                <div className="flex gap-4 items-start">
                   <div className="shrink-0 mt-1">
                      <Quote className="w-5 h-5 text-primary/60" />
                   </div>
                   <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-medium">
                     {data.coach_message}
                   </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox 
                icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
                label={language === 'ar' ? 'الأنشطة' : 'Activities'}
                value={data.completed_count}
              />
              <StatBox 
                icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
                label={language === 'ar' ? 'النقاط' : 'Points'}
                value={data.total_points}
                highlight
              />
              <StatBox 
                icon={<Calendar className="w-4 h-4 text-orange-500" />}
                label={language === 'ar' ? 'أفضل يوم' : 'Best Day'}
                value={data.best_day ? new Date(data.best_day).toLocaleDateString('en-US', { weekday: 'short' }) : '-'}
              />
            </div>

            {/* Best Activity */}
            {data.best_activity && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-transparent p-3 rounded-xl border-l-4 border-orange-500/50 ltr:border-l-4 rtl:border-r-4 rtl:border-l-0">
                <Medal className="w-5 h-5 text-orange-600 shrink-0" />
                <span className="text-sm font-medium text-foreground/80">
                  {language === 'ar' ? 'أفضل نشاط:' : 'Best Activity:'} <span className="text-foreground font-bold">{data.best_activity}</span>
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Patterns */}
              {data.patterns?.length > 0 && (
                <SectionList 
                  title={language === 'ar' ? 'الأنماط الملاحظة' : 'Observed Patterns'}
                  icon={<TrendingUp className="w-4 h-4" />}
                  items={data.patterns}
                  colorClass="text-blue-500"
                  bgClass="bg-blue-500/10"
                />
              )}

              {/* Improvements */}
              {data.improvements?.length > 0 && (
                <SectionList 
                  title={language === 'ar' ? 'اقتراحات للتحسين' : 'Improvements'}
                  icon={<Lightbulb className="w-4 h-4" />}
                  items={data.improvements}
                  colorClass="text-yellow-600"
                  bgClass="bg-yellow-500/10"
                />
              )}

              {/* Next Week Plan */}
              {data.next_week_plan?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">
                      {language === 'ar' ? 'خطة الأسبوع القادم' : 'Next Week Plan'}
                    </h4>
                  </div>
                  <div className="grid gap-2">
                    {data.next_week_plan.map((task, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-sm font-medium truncate">{task.task}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 rounded-full px-2 bg-background shrink-0">
                          {task.frequency}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// مكونات فرعية صغيرة لتبسيط الكود الرئيسي

function StatBox({ icon, label, value, highlight = false }: { icon: any, label: string, value: any, highlight?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200",
      highlight 
        ? "bg-primary/5 border-primary/20 shadow-sm" 
        : "bg-card border-border/40 hover:bg-muted/30"
    )}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className={cn("text-xl font-bold tracking-tight", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function SectionList({ title, icon, items, colorClass, bgClass }: { title: string, icon: any, items: string[], colorClass: string, bgClass: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", bgClass)}>
          <div className={colorClass}>{icon}</div>
        </div>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
      </div>
      <div className="space-y-2 ltr:pl-2 rtl:pr-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 text-sm text-muted-foreground/90 group">
            <ArrowRight className={cn("w-4 h-4 mt-0.5 shrink-0 transition-transform opacity-50 group-hover:opacity-100 rtl:rotate-180", colorClass)} />
            <span className="leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
