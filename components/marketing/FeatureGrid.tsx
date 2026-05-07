import {
  BookOpen,
  CheckSquare,
  Sparkles,
  ClipboardList,
  Users,
  ScrollText,
} from "lucide-react";

const CAPABILITIES = [
  {
    n: "01",
    icon: BookOpen,
    title: "From textbook to course",
    body:
      "Drop in any open textbook PDF or chapter set. SOL drafts a structured course outline, learning objectives, and a quiz bank in minutes.",
  },
  {
    n: "02",
    icon: ClipboardList,
    title: "Authoring without friction",
    body:
      "A focused editor for multiple choice, free response, and code. Versioned drafts. Revision marks visible to graders. No clutter.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "AI grading you can audit",
    body:
      "Free-response answers are graded with rubric-aligned reasoning. Every score includes the model's working — citations, not vibes.",
  },
  {
    n: "04",
    icon: Users,
    title: "Sections, cohorts, roles",
    body:
      "Run small seminars or 800-student lectures. Assign quizzes by section, manage TAs, and copy a course at the start of a new term.",
  },
  {
    n: "05",
    icon: CheckSquare,
    title: "Honest analytics",
    body:
      "See what learners struggle with — by question, by topic, by section — without dark-pattern dashboards designed to flatter.",
  },
  {
    n: "06",
    icon: ScrollText,
    title: "Exportable, archival",
    body:
      "Every attempt is exportable as CSV or print-ready PDF. Records belong to the institution, not the platform.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      id="capabilities"
      className="bg-paper border-t border-rule"
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10 mb-14">
          <div className="md:col-span-5 flex flex-col gap-3">
            <span className="eyebrow">Capabilities</span>
            <h2
              className="font-display text-ink"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.05,
                fontVariationSettings: '"opsz" 96, "SOFT" 30',
              }}
            >
              Everything a course needs.
              <br />
              <em className="text-brand" style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}>
                Nothing it doesn&apos;t.
              </em>
            </h2>
          </div>
          <div className="md:col-span-7 md:pt-2">
            <p className="text-base md:text-lg text-ink-muted leading-relaxed max-w-[60ch]">
              SOL is built for institutions that want their learning
              technology to disappear behind the work — not become the work.
              Every screen is shaped by faculty who teach for a living.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule rounded-lg overflow-hidden border border-rule">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <article
                key={cap.n}
                className="bg-surface p-7 flex flex-col gap-3 transition-colors hover:bg-surface-sunken/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono tnum text-xs text-ink-faint">
                    {cap.n}
                  </span>
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <h3
                  className="font-display text-ink"
                  style={{
                    fontSize: "1.25rem",
                    lineHeight: 1.3,
                    fontVariationSettings: '"opsz" 36',
                  }}
                >
                  {cap.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {cap.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
