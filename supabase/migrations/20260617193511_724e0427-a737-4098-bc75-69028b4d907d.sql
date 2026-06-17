
-- =========================================================
-- UNTRAP V1: Full backend architecture expansion
-- =========================================================

-- ---------- Roles (admin support) ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- Shared updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Student profiles (extends existing public.profiles) ----------
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INTEGER,
  education_level TEXT,
  city TEXT,
  state TEXT,
  language_preference TEXT DEFAULT 'English',
  current_stage TEXT,
  family_background TEXT,
  financial_condition TEXT,
  time_available_daily TEXT,
  learning_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own student profile" ON public.student_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON public.student_profiles(user_id);
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Assessment questions (admin curated) ----------
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  weightage JSONB NOT NULL DEFAULT '{}'::jsonb,
  difficulty_level TEXT DEFAULT 'easy',
  active_status BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_questions TO authenticated, anon;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable" ON public.assessment_questions FOR SELECT TO authenticated, anon
  USING (active_status = true);
CREATE POLICY "admins manage questions" ON public.assessment_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.assessment_questions(category) WHERE active_status;

-- ---------- Assessment responses ----------
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.assessment_questions(id) ON DELETE SET NULL,
  response JSONB NOT NULL,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_responses TO authenticated;
GRANT ALL ON public.assessment_responses TO service_role;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own responses" ON public.assessment_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON public.assessment_responses(user_id, created_at DESC);

-- ---------- Careers knowledge base ----------
CREATE TABLE IF NOT EXISTS public.careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  career_summary TEXT,
  ideal_personality JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  education_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  beginner_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  salary_information JSONB NOT NULL DEFAULT '{}'::jsonb,
  future_scope TEXT,
  common_myths JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty_level TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.careers TO authenticated, anon;
GRANT ALL ON public.careers TO service_role;
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "careers public read" ON public.careers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins manage careers" ON public.careers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_careers_category ON public.careers(category);
CREATE TRIGGER trg_careers_updated BEFORE UPDATE ON public.careers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Career matches ----------
CREATE TABLE IF NOT EXISTS public.career_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_id UUID REFERENCES public.careers(id) ON DELETE SET NULL,
  career_name TEXT NOT NULL,
  match_percentage NUMERIC NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  reasoning TEXT,
  strength_alignment JSONB DEFAULT '[]'::jsonb,
  weakness_alignment JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_matches TO authenticated;
GRANT ALL ON public.career_matches TO service_role;
ALTER TABLE public.career_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matches" ON public.career_matches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON public.career_matches(user_id, match_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_matches_career ON public.career_matches(career_id);

-- ---------- Career traps catalogue ----------
CREATE TABLE IF NOT EXISTS public.career_traps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  solutions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.career_traps TO authenticated, anon;
GRANT ALL ON public.career_traps TO service_role;
ALTER TABLE public.career_traps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "traps public read" ON public.career_traps FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins manage traps" ON public.career_traps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- User-detected traps ----------
CREATE TABLE IF NOT EXISTS public.user_traps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trap_id UUID REFERENCES public.career_traps(id) ON DELETE SET NULL,
  trap_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  explanation TEXT,
  recommended_solution TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_traps TO authenticated;
GRANT ALL ON public.user_traps TO service_role;
ALTER TABLE public.user_traps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_traps" ON public.user_traps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_traps_user ON public.user_traps(user_id, status);

-- ---------- Roadmap templates ----------
CREATE TABLE IF NOT EXISTS public.roadmap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id UUID REFERENCES public.careers(id) ON DELETE CASCADE,
  duration TEXT NOT NULL DEFAULT '30 days',
  weeks JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roadmap_templates TO authenticated, anon;
GRANT ALL ON public.roadmap_templates TO service_role;
ALTER TABLE public.roadmap_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates public read" ON public.roadmap_templates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins manage templates" ON public.roadmap_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_templates_career ON public.roadmap_templates(career_id);

-- ---------- User roadmaps ----------
CREATE TABLE IF NOT EXISTS public.user_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_id UUID REFERENCES public.careers(id) ON DELETE SET NULL,
  goal TEXT,
  duration TEXT NOT NULL DEFAULT '30 days',
  generated_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roadmaps TO authenticated;
GRANT ALL ON public.user_roadmaps TO service_role;
ALTER TABLE public.user_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roadmaps" ON public.user_roadmaps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_roadmaps_user ON public.user_roadmaps(user_id, status);
CREATE TRIGGER trg_user_roadmaps_updated BEFORE UPDATE ON public.user_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Daily tasks ----------
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.user_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER,
  task_title TEXT NOT NULL,
  description TEXT,
  estimated_time TEXT,
  difficulty TEXT DEFAULT 'easy',
  completed BOOLEAN NOT NULL DEFAULT false,
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT ALL ON public.daily_tasks TO service_role;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily tasks" ON public.daily_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_roadmap ON public.daily_tasks(roadmap_id, day_number);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user ON public.daily_tasks(user_id, completed);

-- ---------- User progress ----------
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  career_clarity_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  skill_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.user_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_progress_updated BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Weekly reflections ----------
CREATE TABLE IF NOT EXISTS public.weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  what_learned TEXT,
  what_was_difficult TEXT,
  confidence_rating INTEGER CHECK (confidence_rating BETWEEN 1 AND 10),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reflections TO authenticated;
GRANT ALL ON public.weekly_reflections TO service_role;
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections" ON public.weekly_reflections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON public.weekly_reflections(user_id, week_number);

-- ---------- AI chat history (enhanced) ----------
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_role TEXT NOT NULL,
  user_message TEXT,
  ai_response TEXT,
  context_used JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai chat" ON public.ai_chat_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON public.ai_chat_history(user_id, created_at DESC);

-- ---------- Knowledge base ----------
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  embedding JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_base TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb authenticated read" ON public.knowledge_base FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage kb" ON public.knowledge_base FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_kb_category ON public.knowledge_base(category);

-- ---------- Analytics events ----------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events insert" ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_events_user_time ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON public.analytics_events(event_name, created_at DESC);

-- ---------- Seed: a few starter careers ----------
INSERT INTO public.careers (career_name, category, description, career_summary, future_scope, difficulty_level)
VALUES
  ('UX Designer', 'Design', 'Designs user experiences for digital products.', 'Blend of empathy, design and tech.', 'High demand across product, fintech, edtech.', 'medium'),
  ('Data Analyst', 'Tech', 'Turns raw data into business insight.', 'Great entry into tech without heavy coding.', 'Strong demand in India across industries.', 'medium'),
  ('Digital Marketer', 'Business', 'Grows brands online through content, ads, SEO.', 'Creative + analytical career, low entry barrier.', 'Booming with India''s digital adoption.', 'easy'),
  ('Software Engineer', 'Tech', 'Builds applications and systems.', 'Classic high-paying tech career.', 'Stable global demand.', 'hard')
ON CONFLICT (career_name) DO NOTHING;

-- ---------- Seed: starter traps ----------
INSERT INTO public.career_traps (trap_name, category, description, symptoms, solutions, recommended_actions)
VALUES
  ('Family Pressure', 'External',
   'Parents pushing one path regardless of fit.',
   '["guilt","fear","silence at home"]'::jsonb,
   '["structured conversation","show evidence careers"]'::jsonb,
   '["share a 1-page career plan with parents"]'::jsonb),
  ('Financial Anxiety', 'External',
   'Fear that the chosen path will not pay early.',
   '["avoiding research","picking only ''safe'' careers"]'::jsonb,
   '["map free learning + earning ladders"]'::jsonb,
   '["list 3 paid skills you can learn in 60 days"]'::jsonb),
  ('Confusion Loop', 'Internal',
   'Endless research without commitment.',
   '["bookmarking everything","starting nothing"]'::jsonb,
   '["pick 1 path for 30 days"]'::jsonb,
   '["start the 30-day roadmap today"]'::jsonb)
ON CONFLICT (trap_name) DO NOTHING;
