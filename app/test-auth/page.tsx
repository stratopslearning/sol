import { Badge } from "@/components/ui/badge";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { appRedirect } from "@/lib/serverRedirect";

export default async function TestAuthPage() {
  const user = await getOrCreateUser();

  if (!user) {
    appRedirect("/login");
  }

  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: "ID",
      value: <span className="font-mono text-sm">{user.id}</span>,
    },
    {
      label: "Clerk ID",
      value: <span className="font-mono text-sm">{user.clerkId}</span>,
    },
    { label: "Email", value: user.email },
    {
      label: "Name",
      value: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—",
    },
    {
      label: "Role",
      value: <Badge variant="info">{user.role}</Badge>,
    },
    {
      label: "Paid",
      value: user.paid ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="outline">Trial</Badge>
      ),
    },
    {
      label: "Created",
      value: (
        <span className="tnum text-sm">
          {user.createdAt.toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <span className="eyebrow text-ink-faint">Internal · Debug</span>
          <h1 className="font-display text-3xl text-ink mt-2">
            User sync test
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Database record for the currently authenticated user.
          </p>
        </header>

        <section className="paper paper-shadow p-6">
          <h2 className="font-display text-xl text-ink mb-4">Profile</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
            {items.map((item) => (
              <div
                key={item.label}
                className="contents sm:contents border-b border-rule pb-2 last:border-0"
              >
                <dt className="eyebrow text-ink-faint pt-1">{item.label}</dt>
                <dd className="text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 paper border-info/30 bg-info-soft/40 p-3 rounded-md">
            <p className="text-sm text-info-fg">
              User successfully synced from Clerk to the database.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
