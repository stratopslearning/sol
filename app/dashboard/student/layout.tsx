import { Suspense, type ReactNode } from 'react';

import { UrlErrorToast } from '@/components/feedback/UrlErrorToast';

export default function StudentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <UrlErrorToast />
      </Suspense>
      {children}
    </>
  );
}
