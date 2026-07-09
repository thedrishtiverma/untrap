
-- =========================================================================
-- UNTRAP Assessment Experience Engine — Phase 0 schema
-- Additive; leaves legacy assessments/assessment_questions/assessment_responses untouched.
-- =========================================================================

-- Ensure updated_at trigger fn exists (already present, but idempotent).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -------------------------------------------------------------------------
-- 1. CONTENT LAYER (admin-authored, student-readable)
-- -------------------------------------------------------------------------

-- Definitions (logical assessments; a single UNTRAP for now)
CREATE TABLE public.assessment_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_definitions TO authenticated;
GRANT ALL ON public.assessment_definitions TO service_role;
ALTER TABLE public.assessment_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read definitions" ON public.assessment_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage definitions" ON public.assessment_definitions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ad_updated BEFORE UPDATE ON public.assessment_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Versions (immutable content snapshots)
CREATE TABLE public.assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES public.assessment_definitions(id) ON DELETE CASCADE,
  version INT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(definition_id, version)
);
GRANT SELECT ON public.assessment_versions TO authenticated;
GRANT ALL ON public.assessment_versions TO service_role;
ALTER TABLE public.assessment_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read published versions" ON public.assessment_versions
  FOR SELECT TO authenticated USING (is_published OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage versions" ON public.assessment_versions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_av_updated BEFORE UPDATE ON public.assessment_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Layers
CREATE TABLE public.ae_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  est_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(version_id, slug)
);
GRANT SELECT ON public.ae_layers TO authenticated;
GRANT ALL ON public.ae_layers TO service_role;
ALTER TABLE public.ae_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read layers" ON public.ae_layers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage layers" ON public.ae_layers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ael_updated BEFORE UPDATE ON public.ae_layers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dimensions
CREATE TABLE public.ae_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES public.ae_layers(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(layer_id, slug)
);
GRANT SELECT ON public.ae_dimensions TO authenticated;
GRANT ALL ON public.ae_dimensions TO service_role;
ALTER TABLE public.ae_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read dimensions" ON public.ae_dimensions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage dimensions" ON public.ae_dimensions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aed_updated BEFORE UPDATE ON public.ae_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Question type registry
CREATE TABLE public.ae_question_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ae_question_types TO authenticated;
GRANT ALL ON public.ae_question_types TO service_role;
ALTER TABLE public.ae_question_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read question types" ON public.ae_question_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage question types" ON public.ae_question_types
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aeqt_updated BEFORE UPDATE ON public.ae_question_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed registered question types (Phase 1 + reserved)
INSERT INTO public.ae_question_types (slug, title, config_schema) VALUES
  ('single_choice',     'Single Choice',      '{"minSelect":1,"maxSelect":1}'::jsonb),
  ('multiple_choice',   'Multiple Choice',    '{"minSelect":0}'::jsonb),
  ('likert',            'Likert Scale',       '{"scale":5}'::jsonb),
  ('priority_ranking',  'Priority Ranking',   '{}'::jsonb),
  ('drag_order',        'Drag Order',         '{}'::jsonb),
  ('slider',            'Slider',             '{"min":0,"max":100,"step":1}'::jsonb),
  ('timeline',          'Timeline',           '{}'::jsonb),
  ('yes_no',            'Yes / No',           '{}'::jsonb),
  ('tag_selection',     'Tag Selection',      '{}'::jsonb),
  ('scenario_cards',    'Scenario Cards',     '{}'::jsonb),
  ('reflection',        'Reflection',         '{"minLength":0,"maxLength":2000}'::jsonb),
  ('short_answer',      'Short Answer',       '{"maxLength":280}'::jsonb),
  ('matrix',            'Matrix',             '{}'::jsonb),
  ('image_choice',      'Image Choice',       '{}'::jsonb),
  ('voice_input',       'Voice Input',        '{}'::jsonb),
  ('file_upload',       'File Upload',        '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Questions
CREATE TABLE public.ae_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  layer_id UUID NOT NULL REFERENCES public.ae_layers(id) ON DELETE CASCADE,
  dimension_id UUID REFERENCES public.ae_dimensions(id) ON DELETE SET NULL,
  order_index INT NOT NULL,
  slug TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES public.ae_question_types(id),
  prompt JSONB NOT NULL,       -- {locale: text}
  description JSONB,
  helper JSONB,
  required BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  a11y JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(version_id, slug)
);
GRANT SELECT ON public.ae_questions TO authenticated;
GRANT ALL ON public.ae_questions TO service_role;
ALTER TABLE public.ae_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read questions" ON public.ae_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage questions" ON public.ae_questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aeq_updated BEFORE UPDATE ON public.ae_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Question options
CREATE TABLE public.ae_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.ae_questions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  label JSONB NOT NULL,     -- {locale: text}
  value TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, value)
);
GRANT SELECT ON public.ae_question_options TO authenticated;
GRANT ALL ON public.ae_question_options TO service_role;
ALTER TABLE public.ae_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read options" ON public.ae_question_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage options" ON public.ae_question_options
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aeqo_updated BEFORE UPDATE ON public.ae_question_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Branch rules (JSON DSL)
CREATE TABLE public.ae_branch_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  source_question_id UUID NOT NULL REFERENCES public.ae_questions(id) ON DELETE CASCADE,
  rule JSONB NOT NULL,
  target JSONB NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ae_branch_rules TO authenticated;
GRANT ALL ON public.ae_branch_rules TO service_role;
ALTER TABLE public.ae_branch_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read branch rules" ON public.ae_branch_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage branch rules" ON public.ae_branch_rules
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aebr_updated BEFORE UPDATE ON public.ae_branch_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- 2. RUNTIME LAYER (student-owned sessions, answers, audit)
-- -------------------------------------------------------------------------

CREATE TABLE public.ae_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','abandoned')),
  current_layer_id UUID REFERENCES public.ae_layers(id) ON DELETE SET NULL,
  current_question_id UUID REFERENCES public.ae_questions(id) ON DELETE SET NULL,
  resume_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ae_sessions_user_idx ON public.ae_sessions(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_sessions TO authenticated;
GRANT ALL ON public.ae_sessions TO service_role;
ALTER TABLE public.ae_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON public.ae_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_aes_updated BEFORE UPDATE ON public.ae_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Answers
CREATE TABLE public.ae_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ae_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.ae_questions(id) ON DELETE CASCADE,
  value JSONB,
  skipped BOOLEAN NOT NULL DEFAULT false,
  time_ms INT,
  client_updated_at TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);
CREATE INDEX ae_answers_session_idx ON public.ae_answers(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_answers TO authenticated;
GRANT ALL ON public.ae_answers TO service_role;
ALTER TABLE public.ae_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own answers" ON public.ae_answers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Answer history (append-only audit)
CREATE TABLE public.ae_answer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES public.ae_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);
CREATE INDEX ae_answer_history_answer_idx ON public.ae_answer_history(answer_id);
GRANT SELECT, INSERT ON public.ae_answer_history TO authenticated;
GRANT ALL ON public.ae_answer_history TO service_role;
ALTER TABLE public.ae_answer_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own history" ON public.ae_answer_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.ae_answer_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Session progress (1:1 with session)
CREATE TABLE public.ae_session_progress (
  session_id UUID PRIMARY KEY REFERENCES public.ae_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  answered_count INT NOT NULL DEFAULT 0,
  remaining_count INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_session_progress TO authenticated;
GRANT ALL ON public.ae_session_progress TO service_role;
ALTER TABLE public.ae_session_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own progress" ON public.ae_session_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_aesp_updated BEFORE UPDATE ON public.ae_session_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Autosave server-side queue (for batch drain / retry)
CREATE TABLE public.ae_autosave_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ae_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ae_autosave_queue TO authenticated;
GRANT ALL ON public.ae_autosave_queue TO service_role;
ALTER TABLE public.ae_autosave_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own autosave queue" ON public.ae_autosave_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Audit trail
CREATE TABLE public.ae_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ae_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ae_audit_session_idx ON public.ae_audit(session_id, at DESC);
GRANT SELECT, INSERT ON public.ae_audit TO authenticated;
GRANT ALL ON public.ae_audit TO service_role;
ALTER TABLE public.ae_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own audit" ON public.ae_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own audit" ON public.ae_audit
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed the definition + v1 (unpublished) so Phase 1 has a container to fill.
INSERT INTO public.assessment_definitions (slug, title, description)
VALUES ('untrap-core', 'UNTRAP Student Intelligence Assessment',
        '8-layer student intelligence assessment (Bible v1)')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.assessment_versions (definition_id, version, is_published)
SELECT id, 1, false FROM public.assessment_definitions WHERE slug = 'untrap-core'
ON CONFLICT DO NOTHING;
