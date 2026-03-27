'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Crown, LockKeyhole, Star } from 'lucide-react';
import Image from 'next/image';
import type { Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { cardClass } from './challenge-types';

interface RewardsSectionProps {
  goalId: string;
  currentPoints: number;
  targetPoints: number;
  language: Language;
  numberFormatter: Intl.NumberFormat;
  t: {
    challengeRewards: string;
    challengeRewardsDesc: string;
    challengeRewardsCurrentPoints: string;
    challengeRewardsGoalScale: string;
    challengeRewardsCurrentRank: string;
    challengeRewardsNextReward: string;
    challengeRewardsOpened: string;
    challengeRewardsTapToOpen: string;
    challengeRewardsLockedHint: string;
    challengeRewardsUnknown: string;
    challengeRewardsReady: string;
    challengeRewardsDeckComplete: string;
    challengeRewardsOpenedHint: string;
    points: string;
  };
}

interface RankDefinition {
  key: string;
  basePoints: number;
  title: Record<Language, string>;
  description: Record<Language, string>;
  palette: {
    accent: string;
    secondary: string;
    ink: string;
    metal: string;
  };
}

interface RewardStage extends RankDefinition {
  id: string;
  threshold: number;
  isUnlocked: boolean;
}

const MATRIX_RANKS: RankDefinition[] = [
  {
    key: 'sleeper',
    basePoints: 0,
    title: { en: 'The Sleeper', ar: 'النائم' },
    description: { en: 'Still caught in old habits.', ar: 'عالق في العادات القديمة.' },
    palette: { accent: '148, 163, 184', secondary: '71, 85, 105', ink: '15, 23, 42', metal: '226, 232, 240' },
  },
  {
    key: 'committed',
    basePoints: 2000,
    title: { en: 'The Committed', ar: 'الملتزم' },
    description: { en: 'Taking your goal seriously.', ar: 'تأخذ أهدافك بجدية.' },
    palette: { accent: '96, 165, 250', secondary: '59, 130, 246', ink: '30, 64, 175', metal: '219, 234, 254' },
  },
  {
    key: 'disciplined',
    basePoints: 5000,
    title: { en: 'The Disciplined', ar: 'المنضبط' },
    description: { en: 'True discipline takes over.', ar: 'يبدأ الانضباط الحقيقي.' },
    palette: { accent: '52, 211, 153', secondary: '16, 185, 129', ink: '6, 78, 59', metal: '209, 250, 229' },
  },
  {
    key: 'warrior',
    basePoints: 15000,
    title: { en: 'The Warrior', ar: 'المحارب' },
    description: { en: 'Fighting excuses daily.', ar: 'تقاتل أعذارك يومياً.' },
    palette: { accent: '251, 113, 133', secondary: '244, 63, 94', ink: '136, 19, 55', metal: '255, 228, 230' },
  },
  {
    key: 'architect',
    basePoints: 50000,
    title: { en: 'The Architect', ar: 'المهندس' },
    description: { en: 'Designing your own future.', ar: 'تصمم مستقبلك بنفسك.' },
    palette: { accent: '45, 212, 191', secondary: '13, 148, 136', ink: '19, 78, 74', metal: '204, 251, 241' },
  },
  {
    key: 'elite',
    basePoints: 100000,
    title: { en: 'The Elite', ar: 'النخبة' },
    description: { en: 'Only 1% reach this level.', ar: '1% فقط يصلون هنا.' },
    palette: { accent: '167, 139, 250', secondary: '139, 92, 246', ink: '76, 29, 149', metal: '237, 233, 254' },
  },
  {
    key: 'exceptional',
    basePoints: 1000000,
    title: { en: 'The Exceptional', ar: 'الاستثنائي' },
    description: { en: 'You broke through the Matrix.', ar: 'اخترقت الماتريكس.' },
    palette: { accent: '244, 114, 182', secondary: '168, 85, 247', ink: '88, 28, 135', metal: '250, 232, 255' },
  },
];

const MAX_BASE_POINTS = MATRIX_RANKS[MATRIX_RANKS.length - 1]?.basePoints || 1000000;

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getBaseRotation(index: number): number {
  return (seededRandom(index * 3) - 0.5) * 14;
}

function buildRewardStages(targetPoints: number, currentPoints: number) {
  const safeTarget = Math.max(1000, Math.round(targetPoints) || 1000);
  const safeCurrent = Math.max(0, Math.round(currentPoints) || 0);
  let previousThreshold = -1;

  return MATRIX_RANKS.map<RewardStage>((rank, index) => {
    if (index === 0) {
      previousThreshold = 0;
      return { ...rank, id: `${rank.key}:0`, threshold: 0, isUnlocked: true };
    }
    const remainingRanks = MATRIX_RANKS.length - index - 1;
    const scaledThreshold = Math.round((rank.basePoints / MAX_BASE_POINTS) * safeTarget);
    const maxAllowed = safeTarget - remainingRanks;
    const threshold =
      index === MATRIX_RANKS.length - 1
        ? safeTarget
        : Math.max(previousThreshold + 1, Math.min(maxAllowed, scaledThreshold));
    previousThreshold = threshold;
    return { ...rank, id: `${rank.key}:${threshold}`, threshold, isUnlocked: safeCurrent >= threshold };
  });
}

function buildCardFace(rank: RewardStage): CSSProperties {
  return {
    background: `linear-gradient(160deg,
      rgba(${rank.palette.secondary}, 1) 0%,
      rgba(${rank.palette.ink}, 1) 55%,
      rgba(${rank.palette.secondary}, 0.85) 100%)`,
  };
}

function buildHoloStyle(rank: RewardStage): CSSProperties {
  return {
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(${rank.palette.metal}, 0.38) 0%, transparent 52%),
      radial-gradient(ellipse at 70% 80%, rgba(${rank.palette.accent}, 0.28) 0%, transparent 52%),
      linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 42%, rgba(255,255,255,0.07) 100%)
    `,
  };
}

function buildBorderStyle(rank: RewardStage, locked = false): CSSProperties {
  return {
    boxShadow: locked
      ? '0 6px 20px rgba(0,0,0,0.5)'
      : `0 0 0 1.5px rgba(${rank.palette.metal}, 0.55),
         0 12px 40px -10px rgba(${rank.palette.ink}, 0.85),
         0 4px 12px rgba(${rank.palette.accent}, 0.25)`,
    border: `1.5px solid rgba(${rank.palette.metal}, ${locked ? '0.15' : '0.45'})`,
  };
}

function buildAccentColor(rank: RewardStage): CSSProperties {
  return { color: `rgba(${rank.palette.metal}, 0.92)` };
}

function CardLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="logo"
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

function CardCorner({
  index,
  rank,
  flip = false,
}: {
  index: number;
  rank: RewardStage;
  flip?: boolean;
}) {
  return (
    <div
      className={cn('flex flex-col items-start', flip && 'rotate-180')}
      style={buildAccentColor(rank)}
    >
      <span className="text-[11px] font-black leading-none">
        {String(index + 1).padStart(2, '0')}
      </span>
      <Star className="mt-0.5 h-[7px] w-[7px] fill-current" />
    </div>
  );
}

/* ══════════════════════════════════════
   Revealed card face (opened / unlocked)
══════════════════════════════════════ */
function RevealedCardFace({
  reward,
  index,
  numberFormatter,
  t,
  language,
  logoSize,
  isMobile,
}: {
  reward: RewardStage;
  index: number;
  numberFormatter: Intl.NumberFormat;
  t: RewardsSectionProps['t'];
  language: Language;
  logoSize: number;
  isMobile: boolean;
}) {
  return (
    <>
      <div className="absolute inset-0" style={buildCardFace(reward)} />
      <div className="absolute inset-0" style={buildHoloStyle(reward)} />
      <div className="absolute inset-[3px] rounded-[10px] border border-white/12" />

      {/* top-left corner */}
      <div className="relative z-10 p-1.5">
        <CardCorner index={index} rank={reward} />
      </div>

      {/* center: logo + title */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1 px-1">
        <CardLogo size={logoSize} />
        <div
          className="text-center font-black uppercase leading-tight tracking-wide"
          style={{
            color: `rgba(${reward.palette.metal}, 0.97)`,
            fontSize: isMobile ? '9px' : 'clamp(8px, 1.8vw, 11px)',
          }}
        >
          {reward.title[language]}
        </div>
      </div>

      {/* bottom strip: points — bigger on mobile */}
      <div
        className="relative z-10 mx-1 mb-1 rounded-[5px] px-1.5 py-1"
        style={{
          background: `rgba(${reward.palette.ink}, 0.75)`,
          border: `1px solid rgba(${reward.palette.metal}, 0.2)`,
        }}
      >
        <div
          className="text-center font-black tracking-wide"
          style={{
            color: `rgba(${reward.palette.metal}, 0.92)`,
            fontSize: isMobile ? '11px' : 'clamp(8px, 1.6vw, 11px)',
          }}
        >
          {numberFormatter.format(reward.threshold)}
        </div>
        <div
          className="text-center font-semibold text-white/50"
          style={{ fontSize: isMobile ? '9px' : 'clamp(6px, 1.3vw, 8px)' }}
        >
          {t.points}
        </div>
      </div>

      {/* bottom-right corner */}
      <div className="absolute bottom-1 right-1 z-10">
        <CardCorner index={index} rank={reward} flip />
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   Locked card face
══════════════════════════════════════ */
function LockedCardFace({
  reward,
  index,
  numberFormatter,
  t,
  isMobile,
}: {
  reward: RewardStage;
  index: number;
  numberFormatter: Intl.NumberFormat;
  t: RewardsSectionProps['t'];
  isMobile: boolean;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg,
            rgba(${reward.palette.ink}, 0.95) 0%,
            rgba(${reward.palette.secondary}, 0.7) 100%)`,
          filter: 'saturate(0.35) brightness(0.6)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.5) 0px,
            rgba(255,255,255,0.5) 1px,
            transparent 1px,
            transparent 9px
          )`,
        }}
      />
      <div className="absolute inset-0 bg-black/38" />
      <div className="absolute inset-[3px] rounded-[10px] border border-white/8" />

      <div className="relative z-10 p-1.5 text-white/30">
        <span className="text-[11px] font-black leading-none">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1 px-1">
        <LockKeyhole className="h-5 w-5 text-white/25" />
        <div
          className="text-center font-black uppercase tracking-wider text-white/25"
          style={{ fontSize: isMobile ? '8px' : 'clamp(7px, 1.6vw, 10px)' }}
        >
          {t.challengeRewardsUnknown}
        </div>
      </div>

      <div className="relative z-10 mx-1 mb-1 rounded-[5px] border border-white/8 bg-black/25 px-1.5 py-1">
        <div
          className="text-center font-black text-white/30"
          style={{ fontSize: isMobile ? '11px' : 'clamp(8px, 1.6vw, 11px)' }}
        >
          {numberFormatter.format(reward.threshold)}
        </div>
        <div
          className="text-center font-semibold text-white/20"
          style={{ fontSize: isMobile ? '9px' : 'clamp(6px, 1.3vw, 8px)' }}
        >
          {t.points}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   Single card wrapper
══════════════════════════════════════ */
function RewardCard({
  reward,
  index,
  isOpened,
  isOpening,
  activeId,
  isMobile,
  numberFormatter,
  t,
  language,
  logoSize,
  onOpen,
  onActivate,
  onDeactivate,
}: {
  reward: RewardStage;
  index: number;
  isOpened: boolean;
  isOpening: boolean;
  activeId: string | null;
  isMobile: boolean;
  numberFormatter: Intl.NumberFormat;
  t: RewardsSectionProps['t'];
  language: Language;
  logoSize: number;
  onOpen: (r: RewardStage) => void;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
}) {
  const isActive = activeId === reward.id;
  const baseRot = getBaseRotation(index);
  const cardLabel = `${reward.title[language]} - ${numberFormatter.format(reward.threshold)} ${t.points}`;

  /*
    On mobile: tap lifts the card (translateY -28px, scale 1.12).
    On desktop: hover does the same.
    Animation is snappy: 0.18s ease-out — fast but not jarring.
  */
  const wrapperStyle: CSSProperties = {
    flex: '1 1 0%',
    minWidth: 0,
    position: 'relative',
    zIndex: isActive ? 50 : index,
  };

  const innerStyle: CSSProperties = {
    transform: isActive
      ? 'rotate(0deg) translateY(-28px) scale(1.12)'
      : `rotate(${baseRot}deg)`,
    transition: 'transform 0.18s ease-out',
    transformOrigin: 'bottom center',
  };

  const sharedClass =
    'relative flex aspect-[0.69] w-full flex-col overflow-hidden rounded-[11px] text-white';

  const faceProps = {
    reward,
    index,
    numberFormatter,
    t,
    language,
    logoSize,
    isMobile,
  };

  const content =
    isOpened || reward.isUnlocked ? (
      <RevealedCardFace {...faceProps} />
    ) : (
      <LockedCardFace {...faceProps} />
    );

  /* Mobile: onTouchStart activates, onTouchEnd deactivates + opens */
  const mobileHandlers = isMobile
    ? {
        onTouchStart: () => onActivate(reward.id),
        onTouchEnd: () => {
          onDeactivate();
          if (reward.isUnlocked && !isOpened) onOpen(reward);
        },
      }
    : {};

  /* Desktop: hover activates */
  const desktopHandlers = !isMobile
    ? {
        onMouseEnter: () => onActivate(reward.id),
        onMouseLeave: onDeactivate,
      }
    : {};

  return (
    <div style={wrapperStyle} {...mobileHandlers} {...desktopHandlers}>
      <div style={innerStyle}>
        {reward.isUnlocked && !isOpened ? (
          <button
            type="button"
            onClick={!isMobile ? () => onOpen(reward) : undefined}
            aria-label={cardLabel}
            data-opening={isOpening ? 'true' : 'false'}
            className={cn(sharedClass, 'cursor-pointer outline-none')}
            style={buildBorderStyle(reward)}
          >
            {content}
          </button>
        ) : (
          <div
            className={cn(sharedClass, !reward.isUnlocked && 'cursor-default')}
            style={buildBorderStyle(reward, !reward.isUnlocked)}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Deck row
══════════════════════════════════════ */
function DeckRow({
  rewards,
  startIndex,
  openedRewardSet,
  openingRewardId,
  activeId,
  isMobile,
  numberFormatter,
  t,
  language,
  logoSize,
  topPad,
  onOpen,
  onActivate,
  onDeactivate,
}: {
  rewards: RewardStage[];
  startIndex: number;
  openedRewardSet: Set<string>;
  openingRewardId: string | null;
  activeId: string | null;
  isMobile: boolean;
  numberFormatter: Intl.NumberFormat;
  t: RewardsSectionProps['t'];
  language: Language;
  logoSize: number;
  topPad: number;
  onOpen: (r: RewardStage) => void;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
}) {
  return (
    <div
      className="flex w-full items-end justify-between overflow-visible"
      style={{ paddingTop: `${topPad}px`, paddingBottom: '8px' }}
    >
      {rewards.map((reward, i) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          index={startIndex + i}
          isOpened={reward.isUnlocked && openedRewardSet.has(reward.id)}
          isOpening={openingRewardId === reward.id}
          activeId={activeId}
          isMobile={isMobile}
          numberFormatter={numberFormatter}
          t={t}
          language={language}
          logoSize={logoSize}
          onOpen={onOpen}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════ */
export function RewardsSection({
  goalId,
  currentPoints,
  targetPoints,
  language,
  numberFormatter,
  t,
}: RewardsSectionProps) {
  const rewards = useMemo(
    () => buildRewardStages(targetPoints, currentPoints),
    [currentPoints, targetPoints],
  );

  const storageKey = useMemo(
    () => `metrix:challenge-rewards:${goalId}:${Math.max(1000, Math.round(targetPoints) || 1000)}`,
    [goalId, targetPoints],
  );

  const [openedRewardIds, setOpenedRewardIds] = useState<string[]>([]);
  const [openingRewardId, setOpeningRewardId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const mqlRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    mqlRef.current = mql;
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStorageReady(false);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) { setOpenedRewardIds([]); setStorageReady(true); return; }
      const parsed = JSON.parse(raw);
      const validIds = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is string =>
              typeof item === 'string' && rewards.some((r) => r.id === item),
          )
        : [];
      setOpenedRewardIds(validIds);
    } catch {
      setOpenedRewardIds([]);
    } finally {
      setStorageReady(true);
    }
  }, [rewards, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !storageReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(openedRewardIds));
  }, [openedRewardIds, storageKey, storageReady]);

  useEffect(() => {
    if (!openingRewardId) return;
    const timer = window.setTimeout(() => {
      setOpenedRewardIds((prev) =>
        prev.includes(openingRewardId) ? prev : [...prev, openingRewardId],
      );
      setOpeningRewardId(null);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [openingRewardId]);

  const openedRewardSet = useMemo(() => new Set(openedRewardIds), [openedRewardIds]);

  const handleOpenReward = (reward: RewardStage) => {
    if (!reward.isUnlocked || openedRewardSet.has(reward.id) || openingRewardId) return;
    setOpeningRewardId(reward.id);
  };

  /*
    Mobile layout:
    - Row 1: cards 1-4, overlap with negative margin
    - Row 2: cards 5-7, overlap, centered under row 1
    The two rows overlap vertically by ~30% of card height
    to save vertical space while still showing both rows.
  */
  const row1 = isMobile ? rewards.slice(0, 4) : rewards;
  const row2 = isMobile ? rewards.slice(4) : [];

  const logoSize = isMobile ? 24 : 30;

  /* Shared props for DeckRow */
  const sharedRowProps = {
    openedRewardSet,
    openingRewardId,
    activeId,
    isMobile,
    numberFormatter,
    t,
    language,
    logoSize,
    onOpen: handleOpenReward,
    onActivate: (id: string) => setActiveId(id),
    onDeactivate: () => setActiveId(null),
  };

  return (
    <section className={cn(cardClass, 'relative overflow-hidden')}>
      {/* Ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(250,204,21,0.07), transparent 40%), radial-gradient(circle at bottom left, rgba(56,189,248,0.07), transparent 40%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-3/14 text-chart-3 ring-1 ring-chart-3/25">
            <Crown className="h-4 w-4" />
          </div>
          <span className="text-sm font-black text-foreground">{t.challengeRewards}</span>
        </div>
        <div className="rounded-full border border-chart-3/20 bg-chart-3/8 px-3 py-1 text-[11px] font-black text-chart-3">
          {numberFormatter.format(rewards.length)} {t.challengeRewards}
        </div>
      </div>

      {/* ══ Deck ══ */}
      <div className="relative z-10 mt-2 w-full overflow-visible">

        {/* Row 1 */}
        <DeckRow
          rewards={row1}
          startIndex={0}
          topPad={isMobile ? 28 : 32}
          {...sharedRowProps}
        />

        {/* Row 2 — mobile only, overlaps row 1 slightly */}
        {row2.length > 0 && (
          /*
            marginTop: negative value pulls row 2 up so it visually
            overlaps the bottom of row 1 — saves height, looks stacked.
          */
          <div
            className="flex justify-center overflow-visible"
            style={{ marginTop: '-12px' }}
          >
            <div
              className="flex items-end justify-center overflow-visible"
              style={{
                width: `${(row2.length / row1.length) * 100}%`,
                paddingTop: '28px',
                paddingBottom: '8px',
                gap: '0px',
              }}
            >
              {row2.map((reward, i) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  index={row1.length + i}
                  isOpened={reward.isUnlocked && openedRewardSet.has(reward.id)}
                  isOpening={openingRewardId === reward.id}
                  activeId={activeId}
                  isMobile={isMobile}
                  numberFormatter={numberFormatter}
                  t={t}
                  language={language}
                  logoSize={logoSize}
                  onOpen={handleOpenReward}
                  onActivate={(id) => setActiveId(id)}
                  onDeactivate={() => setActiveId(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
