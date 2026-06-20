
CREATE TABLE public.career_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_name TEXT NOT NULL UNIQUE,
  category TEXT,
  short_description TEXT,
  career_identity TEXT,
  ideal_personality JSONB NOT NULL DEFAULT '{}'::jsonb,
  interest_alignment JSONB NOT NULL DEFAULT '[]'::jsonb,
  strength_alignment JSONB NOT NULL DEFAULT '[]'::jsonb,
  who_should_consider TEXT,
  who_should_avoid TEXT,
  common_misconceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  advanced_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools_and_technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
  education_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  beginner_entry_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  six_month_growth_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  one_year_growth_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_projects JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_growth_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  salary_reality_india JSONB NOT NULL DEFAULT '{}'::jsonb,
  global_opportunities TEXT,
  future_scope TEXT,
  financial_barriers TEXT,
  time_commitment TEXT,
  common_traps JSONB NOT NULL DEFAULT '[]'::jsonb,
  alternative_careers JSONB NOT NULL DEFAULT '[]'::jsonb,
  untrap_first_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.career_profiles TO authenticated;
GRANT ALL ON public.career_profiles TO service_role;

ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read career profiles"
  ON public.career_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert career profiles"
  ON public.career_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update career profiles"
  ON public.career_profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete career profiles"
  ON public.career_profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_career_profiles_updated_at
  BEFORE UPDATE ON public.career_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_career_profiles_category ON public.career_profiles (category);
