'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Full-bleed authoring canvas: conversation + optional artifact panel. */
export function AuthoringWorkspaceShell({
  conversation,
  artifact,
  artifactOpen,
  className,
}: {
  conversation: ReactNode;
  artifact?: ReactNode;
  artifactOpen: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 bg-surface',
        // Fill viewport under faculty top bar (~3.5rem)
        'h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col transition-[flex-basis] duration-300 ease-out motion-reduce:transition-none',
          artifactOpen ? 'flex-[1_1_48%]' : 'flex-1',
        )}
      >
        {conversation}
      </div>
      <div
        className={cn(
          'hidden min-h-0 overflow-hidden border-l border-rule/70 bg-surface transition-[width,opacity,transform] duration-300 ease-out motion-reduce:transition-none lg:block',
          artifactOpen
            ? 'w-[min(42rem,52%)] translate-x-0 opacity-100'
            : 'pointer-events-none w-0 translate-x-4 border-l-0 opacity-0',
        )}
        aria-hidden={!artifactOpen}
      >
        {artifactOpen ? (
          <div className="flex h-full min-h-0 w-[min(42rem,100%)] flex-col">
            {artifact}
          </div>
        ) : null}
      </div>
    </div>
  );
}
