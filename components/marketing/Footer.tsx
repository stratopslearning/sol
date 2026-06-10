import { withBasePath } from "@/lib/basePath";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="access" className="bg-paper border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-16">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 flex flex-col gap-4">
            <a
              href={withBasePath("/")}
              className="inline-flex items-baseline gap-1 text-ink"
            >
              <span
                className="font-display text-2xl tracking-tight"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
              >
                SOL
              </span>
            </a>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[44ch]">
              A quiz and grading platform for professors who are tired of
              scoring short answers by hand. Built with faculty, not around
              them.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 gap-8 max-w-md">
            <FooterColumn
              title="Platform"
              links={[
                { label: "Capabilities", href: "#capabilities" },
                { label: "Approach", href: "#approach" },
              ]}
            />
            <FooterColumn
              title="Account"
              links={[
                { label: "Sign in", href: withBasePath("/login") },
                { label: "Sign Up", href: withBasePath("/signup") },
              ]}
            />
          </div>
        </div>

        <div className="hairline mt-14 mb-6" />

        <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-3 text-xs text-ink-faint">
          <span>&copy; {year} SOL Learning. All rights reserved.</span>
          <span className="font-mono tnum">
            v3 · {year} edition
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">{title}</span>
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
