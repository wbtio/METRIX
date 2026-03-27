'use client';

import { useState } from 'react';
import { Sparkles, Dumbbell, Book, Briefcase, Palette, DollarSign, Heart, Code, Globe, Music, ChevronRight } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface GoalTemplate {
    id: string;
    icon: any;
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    category: string;
    targetPoints: number;
    estimatedDays: number;
    tasks: { task: string; frequency: string; impact_weight: number }[];
}

const TEMPLATES: GoalTemplate[] = [
    {
        id: 'fitness-weight-loss',
        icon: Dumbbell,
        titleEn: 'Lose 10kg in 3 Months',
        titleAr: 'خسارة 10 كيلو في 3 أشهر',
        descriptionEn: 'Structured fitness and nutrition plan',
        descriptionAr: 'خطة لياقة وتغذية منظمة وشاملة',
        category: 'fitness',
        targetPoints: 10000,
        estimatedDays: 90,
        tasks: [
            { task: 'Cardio workout 30 minutes', frequency: 'daily', impact_weight: 5 },
            { task: 'Track calories and meals', frequency: 'daily', impact_weight: 4 },
            { task: 'Strength training', frequency: 'x_times_per_week', impact_weight: 4 },
            { task: 'Drink 2L water', frequency: 'daily', impact_weight: 3 },
        ]
    },
    {
        id: 'learn-programming',
        icon: Code,
        titleEn: 'Master Python Programming',
        titleAr: 'إتقان برمجة بايثون',
        descriptionEn: 'From basics to advanced projects',
        descriptionAr: 'من الأساسيات إلى المشاريع المتقدمة',
        category: 'education',
        targetPoints: 10000,
        estimatedDays: 120,
        tasks: [
            { task: 'Study Python concepts 1 hour', frequency: 'daily', impact_weight: 5 },
            { task: 'Practice coding exercises', frequency: 'daily', impact_weight: 5 },
            { task: 'Build a mini project', frequency: 'weekly', impact_weight: 4 },
            { task: 'Review and debug code', frequency: 'daily', impact_weight: 3 },
        ]
    },
    {
        id: 'career-promotion',
        icon: Briefcase,
        titleEn: 'Get Promoted at Work',
        titleAr: 'الحصول على ترقية في العمل',
        descriptionEn: 'Develop skills and prove your value',
        descriptionAr: 'تطوير المهارات وإثبات قيمتك المهنية',
        category: 'career',
        targetPoints: 10000,
        estimatedDays: 180,
        tasks: [
            { task: 'Complete work projects excellently', frequency: 'daily', impact_weight: 5 },
            { task: 'Learn new professional skill', frequency: 'daily', impact_weight: 4 },
            { task: 'Network with colleagues/leaders', frequency: 'weekly', impact_weight: 4 },
            { task: 'Document achievements', frequency: 'weekly', impact_weight: 3 },
        ]
    },
    {
        id: 'learn-language',
        icon: Globe,
        titleEn: 'Learn English Fluently',
        titleAr: 'تعلم الإنجليزية بطلاقة',
        descriptionEn: 'Speak, read, and write confidently',
        descriptionAr: 'تحدث واقرأ واكتب بثقة تامة',
        category: 'education',
        targetPoints: 10000,
        estimatedDays: 180,
        tasks: [
            { task: 'Practice speaking 20 minutes', frequency: 'daily', impact_weight: 5 },
            { task: 'Learn 10 new words', frequency: 'daily', impact_weight: 4 },
            { task: 'Watch English content', frequency: 'daily', impact_weight: 3 },
            { task: 'Write a short paragraph', frequency: 'daily', impact_weight: 4 },
        ]
    },
    {
        id: 'save-money',
        icon: DollarSign,
        titleEn: 'Save $5000 in 6 Months',
        titleAr: 'توفير 5000 دينار في 6 أشهر',
        descriptionEn: 'Build your emergency fund',
        descriptionAr: 'بناء صندوق الطوارئ والادخار',
        category: 'finance',
        targetPoints: 10000,
        estimatedDays: 180,
        tasks: [
            { task: 'Track daily expenses', frequency: 'daily', impact_weight: 5 },
            { task: 'Avoid unnecessary purchases', frequency: 'daily', impact_weight: 4 },
            { task: 'Save fixed amount weekly', frequency: 'weekly', impact_weight: 5 },
            { task: 'Review budget and adjust', frequency: 'weekly', impact_weight: 3 },
        ]
    },
    {
        id: 'learn-art',
        icon: Palette,
        titleEn: 'Master Digital Art',
        titleAr: 'إتقان الرسم الرقمي',
        descriptionEn: 'Create stunning digital artwork',
        descriptionAr: 'إنشاء أعمال فنية رقمية احترافية',
        category: 'hobby',
        targetPoints: 10000,
        estimatedDays: 90,
        tasks: [
            { task: 'Practice drawing 1 hour', frequency: 'daily', impact_weight: 5 },
            { task: 'Study art fundamentals', frequency: 'daily', impact_weight: 4 },
            { task: 'Complete a full artwork', frequency: 'weekly', impact_weight: 5 },
            { task: 'Get feedback from community', frequency: 'weekly', impact_weight: 3 },
        ]
    },
];

interface GoalTemplatesProps {
    onSelectTemplate: (template: GoalTemplate) => void;
    language?: Language;
}

export default function GoalTemplates({ onSelectTemplate, language = 'en' }: GoalTemplatesProps) {
    const isArabic = language === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';
    const [selectedCategory, setSelectedCategory] = useState<string>('fitness');

    const categories = [
        { id: 'fitness', labelEn: 'Fitness', labelAr: 'اللياقة', icon: Dumbbell },
        { id: 'education', labelEn: 'Education', labelAr: 'التعليم', icon: Book },
        { id: 'career', labelEn: 'Career', labelAr: 'المهنة', icon: Briefcase },
        { id: 'finance', labelEn: 'Finance', labelAr: 'المال', icon: DollarSign },
        { id: 'hobby', labelEn: 'Hobbies', labelAr: 'الهوايات', icon: Palette },
    ];

    const filteredTemplates = TEMPLATES.filter(t => t.category === selectedCategory);

    return (
        <div className="space-y-3" dir={direction}>
            {/* Category Filter - Scrollable with clear indication */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all whitespace-nowrap border",
                                isActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                                    : "bg-card/50 text-muted-foreground border-border hover:bg-card hover:text-foreground",
                                isArabic && "font-medium" // Slightly bolder for Arabic readability
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{isArabic ? cat.labelAr : cat.labelEn}</span>
                        </button>
                    );
                })}
            </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredTemplates.map((template) => {
                      const Icon = template.icon;
                      return (
                          <button
                              key={template.id}
                              onClick={() => onSelectTemplate(template)}
                              className={cn(
                                  "group relative flex flex-col justify-start bg-card hover:bg-card/80 border border-border hover:border-primary/50 rounded-lg p-2 transition-all hover:shadow-md text-start h-full",
                              )}
                          >
                              <div className="w-full">
                                  {/* Header: Icon + Title + Chevron in one row */}
                                  <div className="flex items-start gap-2">
                                      <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                                          <Icon className="w-3.5 h-3.5" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-start gap-2">
                                              <h3 className={cn(
                                                  "font-semibold text-foreground group-hover:text-primary transition-colors leading-tight mb-0.5 line-clamp-1",
                                                  isArabic ? "text-[13px]" : "text-[12px]"
                                              )}>
                                                  {isArabic ? template.titleAr : template.titleEn}
                                              </h3>

                                              <ChevronRight className={cn(
                                                  "w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-all shrink-0",
                                                  isArabic && "rotate-180"
                                              )} />
                                          </div>

                                          <p className={cn(
                                              "text-muted-foreground line-clamp-1 mb-1 leading-tight",
                                              isArabic ? "text-[10px]" : "text-[9px]"
                                          )}>
                                              {isArabic ? template.descriptionAr : template.descriptionEn}
                                          </p>

                                          {/* Stats Inline */}
                                          <div className="flex items-center gap-1.5">
                                              <span className={cn(
                                                  "bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground font-medium border border-border/50 leading-none",
                                                  isArabic ? "text-[10px]" : "text-[9px]"
                                              )}>
                                                  {template.estimatedDays} {isArabic ? 'يوم' : 'days'}
                                              </span>
                                              <span className={cn(
                                                  "bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground font-medium border border-border/50 leading-none",
                                                  isArabic ? "text-[10px]" : "text-[9px]"
                                              )}>
                                                  {template.tasks.length} {isArabic ? 'مهام' : 'tasks'}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </button>
                      );
                  })}
              </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-2xl border border-dashed border-border text-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                        {isArabic ? 'لا توجد قوالب في هذه الفئة حالياً' : 'No templates found in this category'}
                    </p>
                </div>
            )}
        </div>
    );
}

export { TEMPLATES };
export type { GoalTemplate };