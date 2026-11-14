'use client';

import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { appPath } from '@/lib/basePath';

/**
 * Completes Clerk session from an LTI sign-in ticket, then redirects into SOL.
 * Canvas posts to /api/lti/launch (server), which redirects here with ?ticket=.
 */
function LtiBridgeInner() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !signIn) return;

    const ticket = params.get('ticket');
    const redirect = params.get('redirect') || appPath('/dashboard/student');
    if (!ticket) {
      setError('Missing sign-in ticket from Canvas launch.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await signIn.create({
          strategy: 'ticket',
          ticket,
        });
        if (cancelled) return;
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.replace(redirect);
          return;
        }
        setError('Could not complete Canvas sign-in. Try launching again.');
      } catch (err) {
        console.error('LTI bridge sign-in failed', err);
        if (!cancelled) {
          setError(
            'Could not complete Canvas sign-in. Try launching again from Canvas.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, signIn, setActive, params, router]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
        <h1 className="font-display text-2xl">Couldn&apos;t open SOL</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl">Opening SOL…</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Finishing your Canvas sign-in.
      </p>
    </main>
  );
}

export default function LtiBridgePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
          <p className="text-sm text-muted-foreground">Opening SOL…</p>
        </main>
      }
    >
      <LtiBridgeInner />
    </Suspense>
  );
}
