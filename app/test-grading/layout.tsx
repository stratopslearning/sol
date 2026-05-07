import { requireDevOrAdminPage } from '@/lib/devGate';

export const dynamic = 'force-dynamic';

export default async function TestGradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDevOrAdminPage();
  return <>{children}</>;
}
