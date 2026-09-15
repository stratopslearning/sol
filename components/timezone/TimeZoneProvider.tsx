'use client';

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { getBrowserTimeZone } from '@/lib/displayTimeZone';

const TimeZoneContext = createContext<string | null>(null);

function subscribe() {
  return () => {};
}

function getServerTimeZone(): string | null {
  return null;
}

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    getServerTimeZone,
  );

  return (
    <TimeZoneContext.Provider value={timeZone}>
      {children}
    </TimeZoneContext.Provider>
  );
}

export function useDisplayTimeZone(): string | null {
  return useContext(TimeZoneContext);
}
