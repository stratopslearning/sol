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
    title: "Quizzes you design",
    body:
      "Write multiple choice, short answer, and long answer questions the way you would on paper. Your rubric, your wording, your standards.",
  },
  {
    n: "02",
    icon: MessageSquareText,
    title: "Subjective answers, graded",
    body:
      "The questions that usually eat your weekend get scored automatically. Short responses and essays are handled by AI tuned for academic answers.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "See why it scored that way",
    body:
      "Every subjective grade comes with reasoning you can read, challenge, and override. You stay the grader of record. The model just does the first pass.",
  },
  {
    n: "04",
    icon: Users,
    title: "Sections and rosters",
    body:
      "Assign quizzes by section, run a seminar or a lecture hall, and keep student work scoped to the right cohort.",
  },
  {
    n: "05",
    icon: CheckSquare,
    title: "Gradebook in one place",
    body:
      "Best scores per student, per quiz, per section. Spot who is struggling before the midterm tells you.",
  },
  {
    n: "06",
    icon: ScrollText,
    title: "Export when you need it",
    body:
      "Pull attempts as CSV or print ready PDF for accreditation, appeals, or your own records.",
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
              Less time grading.
              <br />
              <em className="text-brand" style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}>
                More time teaching.
              </em>
            </h2>
          </div>
          <div className="md:col-span-7 md:pt-2">
            <p className="text-base md:text-lg text-ink-muted leading-relaxed max-w-[60ch]">
              SOL is built for the part of teaching nobody puts on the syllabus:
              grading subjective work at scale. Professors create quizzes,
              students submit, AI handles the answers that used to take hours
              by hand.
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
