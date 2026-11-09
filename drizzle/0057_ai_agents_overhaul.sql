-- AI agents overhaul: override few-shot store, unit insights, authoring review flags,
-- rubric approval on questions, struggle topics on chatbot messages.

CREATE TABLE IF NOT EXISTS grading_override_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  rubric_version integer NOT NULL DEFAULT 1,
  student_answer_snippet text NOT NULL,
  ai_matches jsonb,
  instructor_criteria jsonb,
  instructor_score integer,
  note text,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grading_override_examples_q_idx
  ON grading_override_examples (tenant_id, question_id, rubric_version);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS rubric_status text NOT NULL DEFAULT 'none', -- none | proposed | approved | rejected
  ADD COLUMN IF NOT EXISTS rubric_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rubric_approved_by uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE outline_items
  ADD COLUMN IF NOT EXISTS review_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'none', -- none | pending | flagged | cleared
  ADD COLUMN IF NOT EXISTS ai_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS unit_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  outline_id uuid REFERENCES course_outlines(id) ON DELETE SET NULL,
  module_id uuid REFERENCES outline_modules(id) ON DELETE SET NULL,
  misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unit_insights_course_idx
  ON unit_insights (tenant_id, course_id, created_at DESC);

-- Struggle topics / citation status live in chatbot_sessions.messages jsonb
-- entries; aggregate tags for analytics:
ALTER TABLE chatbot_sessions
  ADD COLUMN IF NOT EXISTS struggle_topics jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS grading_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  openai_batch_id text,
  status text NOT NULL DEFAULT 'pending',
  -- pending | submitted | completed | failed
  attempt_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_count integer NOT NULL DEFAULT 0,
  result_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grading_batches_tenant_idx
  ON grading_batches (tenant_id, created_at DESC);
