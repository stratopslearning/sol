'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronLeft, ChevronRight, RotateCcw } from '@/components/icons';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP);

export type FlashcardItem = {
  id: string;
  front: string;
  back: string;
  position: number;
};

type FlashcardsDeckProps = {
  cards: FlashcardItem[];
  className?: string;
};

export function FlashcardsDeck({ cards, className }: FlashcardsDeckProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const flipInnerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const card = cards[index] ?? null;
  const total = cards.length;
  const progressPct = total > 0 ? ((index + (flipped ? 1 : 0.45)) / total) * 100 : 0;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useGSAP(
    () => {
      if (!flipInnerRef.current) return;
      gsap.to(flipInnerRef.current, {
        rotationY: flipped ? 180 : 0,
        duration: reduceMotion ? 0 : 0.55,
        ease: 'power2.inOut',
        transformPerspective: 1200,
      });
    },
    { dependencies: [flipped, reduceMotion, index], scope: rootRef },
  );

  useGSAP(
    () => {
      if (!rootRef.current || reduceMotion) return;
      const face = rootRef.current.querySelectorAll('[data-card-face]');
      gsap.fromTo(
        face,
        { opacity: 0.55, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.04 },
      );
    },
    { dependencies: [index], scope: rootRef, revertOnUpdate: true },
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= total || next === index) return;
      setFlipped(false);
      if (flipInnerRef.current && !reduceMotion) {
        gsap.set(flipInnerRef.current, { rotationY: 0 });
      }
      setIndex(next);
    },
    [index, total, reduceMotion],
  );

  const flip = useCallback(() => setFlipped((f) => !f), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flip();
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        goTo(index - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, goTo, index]);

  if (total === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-rule bg-surface-sunken/60 px-6 py-10 text-center',
          className,
        )}
      >
        <p className="text-sm text-ink-muted">No flashcards for this lesson yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-rule bg-surface paper-shadow',
        'px-5 py-5 sm:px-6 sm:py-6',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h3
          className="font-display text-ink"
          style={{
            fontSize: '1.25rem',
            lineHeight: 1.2,
            fontVariationSettings: '"opsz" 36',
          }}
        >
          Flashcards
        </h3>
        <span className="shrink-0 rounded-md border border-rule bg-surface-sunken px-2.5 py-1 text-xs font-medium tabular-nums text-ink-muted">
          {index + 1} / {total}
        </span>
      </header>

      <div
        className="h-1 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Flashcard progress"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(8, progressPct))}%` }}
        />
      </div>

      <div className="[perspective:1400px]">
        <button
          type="button"
          onClick={flip}
          aria-pressed={flipped}
          aria-label={flipped ? 'Show question' : 'Reveal answer'}
          className={cn(
            'group relative block w-full cursor-pointer rounded-xl border border-rule',
            'bg-gradient-to-b from-surface to-surface-sunken',
            'outline-none transition-shadow duration-300',
            'hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-brand/40',
            'min-h-[12.5rem] sm:min-h-[15rem]',
          )}
        >
          <div
            ref={flipInnerRef}
            className="relative h-full min-h-[12.5rem] w-full sm:min-h-[15rem]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <CardFace side="front" label="Question">
              {card?.front}
            </CardFace>
            <CardFace side="back" label="Answer">
              {card?.back}
            </CardFace>
          </div>
        </button>
      </div>

      <p className="text-center text-xs text-ink-faint">
        Click card or press <kbd className="rounded border border-rule px-1.5 py-0.5 font-sans text-[0.65rem]">Space</kbd> to flip
        · arrows to move
      </p>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        <div className="flex max-w-[50%] flex-wrap items-center justify-center gap-1.5">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index
                  ? 'w-5 bg-brand'
                  : 'w-2 bg-rule hover:bg-ink-faint',
              )}
            />
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={index >= total - 1}
          onClick={() => goTo(index + 1)}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5 text-ink-muted"
          onClick={() => {
            setFlipped(false);
            if (flipInnerRef.current) gsap.set(flipInnerRef.current, { rotationY: 0 });
            setIndex(0);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart deck
        </Button>
      </div>
    </div>
  );
}

function CardFace({
  side,
  label,
  children,
}: {
  side: 'front' | 'back';
  label: string;
  children: ReactNode;
}) {
  const isBack = side === 'back';
  return (
    <div
      data-card-face
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-8 text-center"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: isBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em]',
          isBack
            ? 'bg-brand-soft text-brand'
            : 'bg-surface-sunken text-ink-muted',
        )}
      >
        {label}
      </span>
      <p
        className={cn(
          'max-w-[28ch] text-balance text-ink',
          isBack ? 'font-sans text-base leading-relaxed sm:text-lg' : 'font-display text-xl leading-snug sm:text-2xl',
        )}
        style={
          isBack
            ? undefined
            : { fontVariationSettings: '"opsz" 72, "SOFT" 30' }
        }
      >
        {children}
      </p>
      <span className="pointer-events-none absolute bottom-4 text-[0.65rem] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        Tap to flip
      </span>
    </div>
  );
}
