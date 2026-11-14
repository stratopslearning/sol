'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
} from '@/components/icons';

import { EmptyState } from '@/components/patterns/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentCalendarEvent } from '@/lib/student/quizCalendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ViewMode = 'date' | 'list';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatListDue(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventCard({ ev }: { ev: StudentCalendarEvent }) {
  return (
    <Link
      href={ev.href}
      className="block rounded-xl border border-rule/80 bg-surface px-4 py-3 transition-colors hover:border-rule-strong hover:bg-surface-sunken/40"
    >
      <p className="font-medium text-ink">{ev.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {formatListDue(ev.dueAt)}
        </span>
        <span aria-hidden>·</span>
        <span>
          {ev.courseTitle} · {ev.sectionName}
        </span>
      </p>
    </Link>
  );
}

export function StudentCalendarClient({
  events,
}: {
  events: StudentCalendarEvent[];
}) {
  const [view, setView] = useState<ViewMode>('date');
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, StudentCalendarEvent[]>();
    for (const ev of events) {
      const d = startOfDay(new Date(ev.dueAt));
      const k = dayKey(d);
      const list = map.get(k) ?? [];
      list.push(ev);
      map.set(k, list);
    }
    return map;
  }, [events]);

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({
        date: new Date(year, month, i - startPad + 1),
        inMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]!.date;
      cells.push({
        date: new Date(
          last.getFullYear(),
          last.getMonth(),
          last.getDate() + 1,
        ),
        inMonth: false,
      });
    }
    return cells;
  }, [cursor]);

  const selectedEvents = byDay.get(dayKey(selected)) ?? [];

  const upcoming = useMemo(() => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    return events.filter((e) => new Date(e.dueAt).getTime() >= cutoff);
  }, [events]);

  const overdue = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.dueAt).getTime() < now);
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-rule bg-surface p-1">
          <button
            type="button"
            onClick={() => setView('date')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
              view === 'date'
                ? 'bg-brand-soft font-medium text-ink'
                : 'text-ink-muted hover:text-ink',
            )}
            aria-pressed={view === 'date'}
          >
            <CalendarDays className="h-4 w-4" />
            Date
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
              view === 'list'
                ? 'bg-brand-soft font-medium text-ink'
                : 'text-ink-muted hover:text-ink',
            )}
            aria-pressed={view === 'list'}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          {events.length} quiz due date{events.length === 1 ? '' : 's'} across
          your sections
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          eyebrow="Calendar"
          title="Nothing due yet."
          description="When quizzes in your sections have an end or due date, they show up here."
        />
      ) : view === 'list' ? (
        <div className="space-y-8">
          {upcoming.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-ink">Upcoming</h2>
              <ul className="flex flex-col gap-2">
                {upcoming.map((ev) => (
                  <li key={ev.id}>
                    <EventCard ev={ev} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {overdue.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-ink-muted">Past</h2>
              <ul className="flex flex-col gap-2 opacity-80">
                {overdue.map((ev) => (
                  <li key={ev.id}>
                    <EventCard ev={ev} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <div className="rounded-2xl border border-rule/80 bg-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Previous month"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-display text-lg text-ink">
                {cursor.toLocaleString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Next month"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint"
                >
                  {d}
                </div>
              ))}
              {monthCells.map(({ date, inMonth }) => {
                const key = dayKey(date);
                const dayEvents = byDay.get(key) ?? [];
                const has = dayEvents.length > 0;
                const isSelected = sameDay(date, selected);
                const isToday = sameDay(date, new Date());
                return (
                  <button
                    key={key + String(inMonth)}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => setSelected(startOfDay(date))}
                    className={cn(
                      'flex min-h-[3.25rem] flex-col items-center rounded-xl px-1 py-1.5 text-sm transition-colors sm:min-h-[4rem]',
                      !inMonth && 'invisible',
                      inMonth &&
                        !isSelected &&
                        'hover:bg-surface-sunken text-ink-muted',
                      isSelected && 'bg-brand text-brand-foreground',
                      !isSelected && isToday && 'ring-1 ring-brand/40',
                    )}
                  >
                    <span
                      className={cn(
                        'tabular-nums',
                        !isSelected && isToday && 'font-semibold text-brand',
                        isSelected && 'font-semibold',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {has ? (
                      <span className="mt-1 flex max-w-full flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isSelected ? 'bg-brand-foreground' : 'bg-brand',
                          )}
                        />
                        {dayEvents.length > 1 ? (
                          <span
                            className={cn(
                              'truncate text-[0.6rem] leading-none',
                              isSelected
                                ? 'text-brand-foreground/80'
                                : 'text-ink-faint',
                            )}
                          >
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-rule/80 bg-surface p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {selected.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <div className="mt-4 space-y-2">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No quizzes due on this day.
                </p>
              ) : (
                selectedEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="block rounded-xl border border-rule/70 px-3 py-3 transition-colors hover:border-rule-strong hover:bg-surface-sunken/50"
                  >
                    <p className="text-sm font-medium text-ink">{ev.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Due {formatTime(ev.dueAt)} · {ev.sectionName}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
