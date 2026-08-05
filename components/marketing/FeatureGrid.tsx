import {
  CheckSquare,
  Sparkles,
  ClipboardList,
  Users,
  ScrollText,
  MessageSquareText,
} from "lucide-react";

const CAPABILITIES = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Quizzes that fit the course",
    body:
      "Multiple choice, short answer, and long answer — written to the course’s own wording and standards, not a generic template.",
  },
  {
    n: "02",
    icon: MessageSquareText,
    title: "Subjective work, scored",
    body:
      "Short responses and essays get careful first-pass scoring so feedback can come back while the material is still fresh.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Feedback you can see",
    body:
      "Every subjective score includes reasoning. Faculty can review or adjust; students get clarity on how work was evaluated.",
  },
  {
    n: "04",
    icon: Users,
    title: "Sections and rosters",
    body:
      "Work stays scoped to the right cohort — seminars, lecture halls, and multi-section courses without mixing streams.",
  },
  {
    n: "05",
    icon: CheckSquare,
    title: "Progress in one place",
    body:
      "Attempts, scores, and section views live together so everyone can see where things stand without chasing spreadsheets.",
  },
  {
    n: "06",
    icon: ScrollText,
    title: "Export when you need it",
    body:
      "Pull attempts as CSV or print-ready PDF for records, appeals, or your own archive.",
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
              Clearer for faculty.
              <br />
              <em className="text-brand" style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}>
                Clearer for students.
              </em>
            </h2>
          </div>
          <div className="md:col-span-7 md:pt-2">
            <p className="text-base md:text-lg text-ink-muted leading-relaxed max-w-[60ch]">
              SOL is a shared coursework space: faculty assign quizzes and
              discussions, students submit and review feedback, and the hard
              parts of scoring subjective answers get a careful first pass —
              with humans still in charge.
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
