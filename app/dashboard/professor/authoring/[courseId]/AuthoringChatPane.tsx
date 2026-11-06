'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Focus,
  History,
  List,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Square,
  X,
} from '@/components/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { SolMark } from '@/components/brand/SolMark';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAuthoringShortcuts } from '@/hooks/useAuthoringShortcuts';
import { formatShortcutKeys, isMacPlatform } from '@/lib/shortcuts/registry';
import { cn } from '@/lib/utils';

import type {
  AttachableDoc,
  CourseCorpusItem,
} from './AuthoringMaterialsPanel';
import {
  AuthoringPlusMenu,
  splitMaterialTitle,
} from './AuthoringPlusMenu';
import type {
  AuthoringChatMessage,
  AuthoringSessionListItem,
  AuthoringSuggestedAction,
} from './types';

export function AuthoringChatPane({
  courseId,
  courseTitle,
  materialsHref,
  materialsReady,
  materialsTotal,
  attachableDocuments,
  corpusItems,
  focusedMaterialIds,
  onFocusedMaterialIdsChange,
  onMaterialsChanged,
  messages,
  chatInput,
  onChatInputChange,
  onSubmit,
  onAction,
  onRetryMessage,
  onOpenArtifact,
  onToggleArtifact,
  onOpenOutline,
  onCloseArtifact,
  onStop,
  sessions = [],
  activeSessionId = null,
  onOpenSession,
  onStartNewChat,
  historyBusy = false,
  busy,
  chatting,
  thinking,
  generating,
  approving,
  canPropose,
  hasOutline,
  needsApproval,
  bodiesBuilt,
  focusLabel,
  showMobileArtifactButton,
  artifactOpen = false,
  toolStatus,
}: {
  courseId: string;
  courseTitle: string;
  materialsHref: string;
  materialsReady: number;
  materialsTotal: number;
  attachableDocuments: AttachableDoc[];
  corpusItems: CourseCorpusItem[];
  focusedMaterialIds: string[];
  onFocusedMaterialIdsChange: (ids: string[]) => void;
  onMaterialsChanged: (opts?: { attachedDocId?: string }) => void;
  messages: AuthoringChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAction: (action: AuthoringSuggestedAction) => void;
  /** Claude-style in-place retry from a user (or assistant) turn. */
  onRetryMessage?: (messageId: string) => void;
  onOpenArtifact: () => void;
  onToggleArtifact?: () => void;
  onOpenOutline?: () => void;
  onCloseArtifact?: () => void;
  onStop?: () => void;
  sessions?: AuthoringSessionListItem[];
  activeSessionId?: string | null;
  onOpenSession?: (sessionId: string) => void;
  onStartNewChat?: () => void;
  historyBusy?: boolean;
  busy: boolean;
  chatting: boolean;
  thinking: boolean;
  generating: boolean;
  approving: boolean;
  canPropose: boolean;
  hasOutline: boolean;
  needsApproval: boolean;
  bodiesBuilt: boolean;
  focusLabel: string | null;
  showMobileArtifactButton: boolean;
  artifactOpen?: boolean;
  toolStatus?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [uploadOpenSignal, setUploadOpenSignal] = useState(0);
  const isWelcome = messages.length === 0 && !hasOutline;
  const streaming = chatting || generating || approving;
  const modHint = formatShortcutKeys('⌘.', isMacPlatform());
  const historyHint = formatShortcutKeys('⌘⇧H', isMacPlatform());

  const canSend =
    !busy &&
    Boolean(chatInput.trim()) &&
    ((!hasOutline && canPropose) ||
      needsApproval ||
      (hasOutline && bodiesBuilt));

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.role === 'user' && m.content.trim()) return m.content;
    }
    return null;
  }, [messages]);

  useAuthoringShortcuts({
    composerRef,
    chatInput,
    setChatInput: onChatInputChange,
    lastUserMessage,
    streaming,
    canSend,
    artifactOpen,
    onStop: () => onStop?.(),
    onSend: () => {
      formRef.current?.requestSubmit();
    },
    onToggleArtifact: () => {
      if (onToggleArtifact) onToggleArtifact();
      else if (artifactOpen) onCloseArtifact?.();
      else onOpenArtifact();
    },
    onOpenOutline: () => {
      if (onOpenOutline) onOpenOutline();
      else onOpenArtifact();
    },
    onCloseArtifact: () => onCloseArtifact?.(),
    onNewChat: () => onStartNewChat?.(),
    onOpenHistory: () => setHistoryOpen(true),
    onOpenUpload: () => setUploadOpenSignal((n) => n + 1),
  });

  useEffect(() => {
    if (!pinnedToBottom) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking, streaming, pinnedToBottom, toolStatus]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinnedToBottom(dist < 80);
  }

  const placeholder = streaming
    ? 'Working…'
    : isWelcome
      ? !hasOutline
        ? canPropose
          ? 'How should we build this course?'
          : 'Add Ready materials first (use +), then describe what to build…'
        : 'How should we build this course?'
      : needsApproval
        ? 'Reply'
        : focusLabel
          ? `Rewrite ${focusLabel}…`
          : 'Reply';

  const starters: AuthoringSuggestedAction[] = [
    {
      id: 'propose',
      label: 'Propose outline from materials',
      action: 'propose',
    },
    {
      id: 'open-materials-hint',
      label: 'Turn syllabus into a quiz',
      action: 'propose',
    },
  ];

  // Prefer concrete parent-driven toolStatus (title + n/N) for every action.
  const statusLine =
    toolStatus ||
    (approving
      ? 'Building assignments…'
      : generating
        ? 'Drafting outline…'
        : chatting
          ? 'Working on your request…'
          : thinking
            ? 'Thinking…'
            : null);

  const islandExpanded =
    isWelcome ||
    composerFocused ||
    Boolean(chatInput.trim()) ||
    focusedMaterialIds.length > 0 ||
    Boolean(statusLine);

  const plusMenu = (
    <AuthoringPlusMenu
      courseId={courseId}
      materialsHref={materialsHref}
      attachableDocuments={attachableDocuments}
      corpusItems={corpusItems}
      focusedMaterialIds={focusedMaterialIds}
      onFocusedMaterialIdsChange={onFocusedMaterialIdsChange}
      disabled={busy}
      onUploaded={() => onMaterialsChanged()}
      onAttached={(docId) => onMaterialsChanged({ attachedDocId: docId })}
      openUploadSignal={uploadOpenSignal}
    />
  );

  const chatsToolbar = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule/60 px-4 py-2.5">
      <p className="min-w-0 truncate text-xs text-ink-muted">
        <span className="font-medium text-ink">{courseTitle}</span>
        {' · '}
        <span className="font-medium text-ink">{materialsReady}</span>/
        {materialsTotal} materials ready
        {focusedMaterialIds.length > 0
          ? ` · focusing ${focusedMaterialIds.length}`
          : ''}
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={historyOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-8"
              disabled={historyBusy}
              aria-label="Previous chats"
              title={`Previous chats (${historyHint})`}
            >
              {historyBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <History />
              )}
              Chats
              {sessions.length > 0 ? ` · ${sessions.length}` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(22rem,calc(100vw-2rem))] p-0"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                Previous chats
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={
                  busy ||
                  historyBusy ||
                  (!hasOutline && messages.length === 0) ||
                  !onStartNewChat
                }
                onClick={() => {
                  setHistoryOpen(false);
                  onStartNewChat?.();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                No saved authoring chats yet. Propose an outline to start one.
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {sessions.map((session) => {
                  const active = session.id === activeSessionId;
                  const archived = session.status === 'ARCHIVED';
                  return (
                    <li key={session.id}>
                      <button
                        type="button"
                        disabled={busy || active || !onOpenSession}
                        onClick={() => {
                          setHistoryOpen(false);
                          onOpenSession?.(session.id);
                        }}
                        className={cn(
                          'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors',
                          active
                            ? 'bg-muted/70'
                            : 'hover:bg-muted/50 disabled:opacity-50',
                        )}
                      >
                        <span className="flex w-full items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                            {session.title || 'Untitled outline'}
                          </span>
                          {active ? (
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Current
                            </span>
                          ) : archived ? (
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Past
                            </span>
                          ) : null}
                        </span>
                        <span className="line-clamp-2 w-full text-[11px] text-muted-foreground">
                          {session.preview ||
                            session.brief ||
                            'No messages yet'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>
        {showMobileArtifactButton ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onOpenArtifact}
            aria-label="Open outline artifact"
            title={`Open outline (${modHint})`}
          >
            <List />
            Outline
          </Button>
        ) : null}
      </div>
    </div>
  );

  const focusChips =
    focusedMaterialIds.length > 0 ? (
      <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
        <span className="mr-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <Focus className="h-3 w-3" aria-hidden />
          Focus
        </span>
        {focusedMaterialIds.map((id) => {
          const item = corpusItems.find((c) => c.id === id);
          if (!item) return null;
          const { folder, name } = splitMaterialTitle(item.title);
          return (
            <span
              key={id}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/80 py-0.5 pl-2.5 pr-1 text-xs text-ink"
            >
              <span className="min-w-0 truncate">
                {folder ? (
                  <>
                    <span className="text-ink-faint">{folder}</span>
                    <span className="text-ink-faint"> / </span>
                  </>
                ) : null}
                {name}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onFocusedMaterialIdsChange(
                    focusedMaterialIds.filter((x) => x !== id),
                  )
                }
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
                aria-label={`Remove ${item.title} from focus`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          disabled={busy}
          onClick={() => onFocusedMaterialIdsChange([])}
          className="ml-0.5 text-[11px] text-ink-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    ) : null;

  const composer = (
    <div
      className={cn(
        'w-full',
        isWelcome ? 'mx-auto max-w-[34rem]' : 'mx-auto max-w-[40rem]',
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) {
          toast.message('Use + to upload files', {
            description: 'Open Upload or add files from the composer.',
          });
        }
      }}
    >
      {focusChips}

      {/* Welcome keeps status on the composer; chat view uses the in-thread indicator only. */}
      {statusLine && isWelcome ? (
        <div
          className="mb-2 flex items-center justify-center gap-2 px-2 text-[11px] text-ink-muted"
          aria-live="polite"
        >
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          <span key={statusLine} className="min-w-0 truncate animate-fade-in">
            {statusLine}
          </span>
          {materialsReady > 0 ? (
            <span className="shrink-0 text-ink-faint">
              {materialsReady}/{materialsTotal} ready
            </span>
          ) : null}
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={cn(
          'overflow-hidden border bg-surface/95 shadow-[var(--shadow-paper)] backdrop-blur-md transition-[border-radius,box-shadow,background-color] duration-200',
          islandExpanded ? 'rounded-[1.65rem]' : 'rounded-full',
          dragOver
            ? 'border-brand/45 bg-brand-soft/40'
            : composerFocused
              ? 'border-rule-strong shadow-[var(--shadow-paper-lg)]'
              : 'border-rule/80',
        )}
      >
        <div
          className={cn(
            'flex gap-1.5',
            islandExpanded ? 'flex-col px-2.5 pb-2.5 pt-2' : 'items-center px-2 py-1.5',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 flex-1',
              islandExpanded ? 'items-start gap-1.5' : 'items-center gap-1.5',
            )}
          >
            <div className="shrink-0 pt-0.5">{plusMenu}</div>
            <Textarea
              ref={composerRef}
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder={placeholder}
              rows={islandExpanded ? (isWelcome ? 3 : 2) : 1}
              disabled={busy && !streaming}
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              className={cn(
                'min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm leading-relaxed shadow-none placeholder:text-ink-faint focus-visible:ring-0',
                islandExpanded
                  ? isWelcome
                    ? 'min-h-[4.5rem]'
                    : 'min-h-[2.75rem]'
                  : 'min-h-[2rem] max-h-[2rem] overflow-hidden py-1.5',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) onSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            {!islandExpanded ? (
              streaming && onStop ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 shrink-0 rounded-full p-0"
                  onClick={onStop}
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSend}
                  className="h-8 w-8 shrink-0 rounded-full p-0"
                  aria-label={!hasOutline ? 'Propose' : 'Send'}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>

          {islandExpanded ? (
            <div className="flex items-center justify-between gap-2 pl-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {isWelcome
                  ? starters.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        disabled={busy || !canPropose}
                        onClick={() => onAction(chip)}
                        className="rounded-full border border-rule/70 bg-surface-sunken/50 px-2.5 py-1 text-[11px] text-ink transition-colors hover:bg-surface-sunken disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))
                  : (
                      <span className="px-1 text-[11px] text-ink-faint">
                        Enter to send · Shift+Enter newline ·{' '}
                        {formatShortcutKeys('⌘/', isMacPlatform())} shortcuts
                      </span>
                    )}
              </div>
              {streaming && onStop ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 shrink-0 rounded-full p-0"
                  onClick={onStop}
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSend}
                  className="h-8 w-8 shrink-0 rounded-full p-0"
                  aria-label={!hasOutline ? 'Propose' : 'Send'}
                >
                  {streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </form>

      <div className="mt-2 flex items-center justify-between gap-3 px-2 text-[11px] text-ink-faint">
        <span className="min-w-0 truncate">
          {isWelcome
            ? `${materialsReady}/${materialsTotal} materials ready`
            : 'SOL can make mistakes — review before publishing.'}
        </span>
        {!isWelcome ? (
          <span className="shrink-0 tabular-nums">
            {materialsReady}/{materialsTotal} ready
          </span>
        ) : null}
      </div>
    </div>
  );

  if (isWelcome) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-paper">
        {chatsToolbar}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10">
          <SolMark className="mb-4 h-10 w-10 text-brand" />
          <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
            {greeting()}
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-ink-muted">
            {courseTitle}
            {canPropose
              ? ' — draft an outline from your materials, then edit in the artifact panel.'
              : ' — add Ready materials with +, then propose an outline.'}
          </p>
          <div className="mt-8 w-full">{composer}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-paper">
      {chatsToolbar}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-5 px-4 py-6">
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              busy={busy}
              onAction={onAction}
              onEdit={
                m.role === 'user'
                  ? () => {
                      onChatInputChange(m.content);
                      toast.message('Message loaded for edit', {
                        description: 'Change it in the composer, then send.',
                      });
                    }
                  : undefined
              }
              onRetry={
                onRetryMessage &&
                (m.role === 'user' || m.role === 'assistant')
                  ? () => onRetryMessage(m.id)
                  : undefined
              }
            />
          ))}
          {thinking || streaming ? (
            <div
              className="flex items-center gap-2 text-xs text-ink-muted"
              aria-live="polite"
            >
              <span className="inline-flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:240ms]" />
              </span>
              <span
                key={statusLine || 'working'}
                className="animate-fade-in"
              >
                {statusLine || 'Working…'}
              </span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {!pinnedToBottom ? (
        <button
          type="button"
          onClick={() => {
            setPinnedToBottom(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-[7.5rem] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-rule/80 bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-[var(--shadow-paper)] backdrop-blur-md"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Jump to latest
        </button>
      ) : null}

      <div className="pointer-events-none shrink-0 bg-gradient-to-t from-paper via-paper/95 to-transparent px-4 pb-3 pt-6">
        <div className="pointer-events-auto">{composer}</div>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(iso?: string) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function MessageActions({
  align,
  when,
  onRetry,
  onEdit,
  onCopy,
}: {
  align: 'start' | 'end';
  when?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      className={cn(
        'mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
        align === 'end' ? 'justify-end' : 'justify-start',
      )}
    >
      {when ? (
        <span className="mr-1 text-[11px] text-ink-faint">{when}</span>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
          aria-label="Retry"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ChatBubble({
  message,
  busy,
  onAction,
  onRetry,
  onEdit,
}: {
  message: AuthoringChatMessage;
  busy: boolean;
  onAction: (action: AuthoringSuggestedAction) => void;
  onRetry?: () => void;
  onEdit?: () => void;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const when = relativeTime(message.createdAt);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-2',
        isUser ? 'items-end' : 'items-start',
      )}
    >
      {isUser ? (
        <div className="flex max-w-[85%] flex-col items-end">
          <div className="rounded-2xl bg-surface-sunken px-4 py-2.5 text-sm leading-relaxed text-ink">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <MessageActions
            align="end"
            when={when}
            onRetry={busy ? undefined : onRetry}
            onEdit={busy ? undefined : onEdit}
            onCopy={() => void copyText()}
          />
        </div>
      ) : (
        <div className="w-full max-w-none">
          {!isSystem ? (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              SOL
            </p>
          ) : null}
          <div
            className={cn(
              'prose prose-sm max-w-none text-ink/90 prose-p:leading-relaxed prose-headings:font-medium prose-headings:text-ink prose-a:text-brand prose-code:rounded prose-code:bg-surface-sunken prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-pre:bg-surface-sunken',
              isSystem && 'text-ink-muted',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          {!isSystem ? (
            <MessageActions
              align="start"
              when={when}
              onRetry={busy ? undefined : onRetry}
              onCopy={() => void copyText()}
            />
          ) : null}
        </div>
      )}

      {message.artifactRef ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onAction({
              id: `ref-${message.id}`,
              label: message.artifactRef!.label,
              action:
                message.artifactRef!.kind === 'item'
                  ? 'open_item'
                  : message.artifactRef!.kind === 'switch_up'
                    ? 'switch_up'
                    : 'open_outline',
              itemId: message.artifactRef!.itemId,
            })
          }
          className="inline-flex max-w-[22rem] items-center gap-3 rounded-2xl border border-rule/80 bg-surface px-3.5 py-3 text-left shadow-sm transition-colors hover:border-rule-strong hover:bg-surface-elevated disabled:opacity-50"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {message.artifactRef.kind === 'outline'
                ? 'Outline'
                : message.artifactRef.kind === 'switch_up'
                  ? 'Switch-up'
                  : 'Assignment'}
            </span>
            <span className="mt-0.5 block truncate text-sm font-medium text-ink">
              {message.artifactRef.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-brand">Open</span>
          </span>
        </button>
      ) : null}

      {message.suggestedActions && message.suggestedActions.length > 0 ? (
        <div className="flex max-w-full flex-wrap gap-1.5">
          {message.suggestedActions.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={busy}
              onClick={() => onAction(chip)}
              className="rounded-full border border-rule bg-surface px-2.5 py-1 text-[11px] text-ink transition-colors hover:bg-surface-sunken disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
