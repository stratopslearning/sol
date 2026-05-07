import { CheckCircle2, Lock } from 'lucide-react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { apiUrl, withBasePath } from '@/lib/basePath';
import { paymentsEnabled } from '@/lib/featureFlags';
import { appRedirect } from '@/lib/serverRedirect';

async function getProductDetails() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}${apiUrl('/api/stripe/product')}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}

export default async function PaymentPage() {
  const user = await getOrCreateUser();
  if (!user) appRedirect('/login');

  // Paywall is currently disabled. Anyone who lands here (e.g. an old
  // bookmark, or a stale link in an email) is sent straight to their
  // dashboard so they don't see a checkout flow that wouldn't process.
  if (!paymentsEnabled()) {
    if (user.role === 'PROFESSOR') appRedirect('/dashboard/professor');
    if (user.role === 'ADMIN') appRedirect('/dashboard/admin');
    appRedirect('/dashboard/student');
  }

  if (user.paid) {
    return (
      <AuthShell
        eyebrow="Enrolment complete"
        title={
          <>
            You&apos;re in.{' '}
            <em
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
            >
              Welcome.
            </em>
          </>
        }
        description="Your enrolment is on file. Every course, every quiz, every attempt is now available to you."
        footnote="If you ever need a receipt or refund, write to enrolment@sol.example — institutional billing teams respond within one business day."
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">
                Payment received
              </span>
              <span className="text-sm text-ink-muted">
                Your access is active immediately. No further steps required.
              </span>
            </div>
          </div>
          <div className="hairline" />
          <Button asChild size="lg">
            <a href={withBasePath('/dashboard/student')}>
              Open your dashboard
            </a>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const productData = await getProductDetails();
  const productName: string =
    productData?.product?.name || 'SOL Learning · Term Access';
  const productDescription: string =
    productData?.product?.description ||
    'A single-term enrolment that opens every course, every quiz, every attempt — for as long as you study.';
  const formattedPrice: string =
    productData?.price?.formatted_amount || '$0.00';

  return (
    <AuthShell
      eyebrow="Final step"
      title={
        <>
          Complete your{' '}
          <em
            className="text-brand"
            style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
          >
            enrolment.
          </em>
        </>
      }
      description="One quiet payment unlocks the term — no recurring charges, no surprise upgrades, no add-ons hidden behind a paywall."
      footnote="Payments are processed by Stripe. SOL never stores your card details. Institutional billing is available — ask your faculty lead."
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5 max-w-md">
            <span className="eyebrow">Product</span>
            <h2
              className="font-display text-ink"
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.2,
                fontVariationSettings: '"opsz" 36',
              }}
            >
              {productName}
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              {productDescription}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="eyebrow">Today</span>
            <span
              className="stat-numeral tnum text-ink"
              style={{ fontSize: '2.25rem' }}
            >
              {formattedPrice}
            </span>
            <span className="text-xs text-ink-faint">one-time</span>
          </div>
        </div>

        <div className="hairline" />

        <ul className="flex flex-col gap-2.5 text-sm text-ink">
          <Bullet>Unlimited course access for the term</Bullet>
          <Bullet>Every quiz, every attempt, every export</Bullet>
          <Bullet>AI-graded free response with audit trail</Bullet>
          <Bullet>Cancel within 14 days for a full refund</Bullet>
        </ul>

        <form
          action={apiUrl('/api/stripe/checkout')}
          method="POST"
          className="flex flex-col gap-3"
        >
          <Button type="submit" size="lg" className="w-full">
            <Lock className="h-4 w-4" />
            Pay {formattedPrice} securely
          </Button>
          <span className="text-xs text-ink-faint text-center">
            Redirected to Stripe · 256-bit TLS · No card data touches SOL
          </span>
        </form>
      </div>
    </AuthShell>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
      <span className="text-ink-muted">{children}</span>
    </li>
  );
}
