import { AppShell } from '@/components/layout/AppShell';
import { resolveDashboardPath } from '@/lib/auth';
import { looksLikeInstitutionalEmail } from '@/lib/onboarding/institutionalEmail';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';

import { OnboardingClient } from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getOrCreateUser();
  if (!user) appRedirect('/login');

  // Bindings / enrollments (not global role) decide if onboarding is done.
  const dest = await resolveDashboardPath(user);
  if (dest !== '/onboarding') {
    appRedirect(dest);
  }

  const showSchoolEmailBanner = looksLikeInstitutionalEmail(user.email);

  return (
    <AppShell role="professor" topbarTitle="Get started">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <OnboardingClient
          userEmail={user.email}
          showSchoolEmailBanner={showSchoolEmailBanner}
        />
      </div>
    </AppShell>
  );
}
