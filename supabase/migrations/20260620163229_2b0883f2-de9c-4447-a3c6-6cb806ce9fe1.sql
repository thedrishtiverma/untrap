
ALTER TABLE public.career_matches
  ADD COLUMN IF NOT EXISTS why_it_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skill_gap JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS first_step TEXT;

CREATE OR REPLACE FUNCTION public.import_career_profiles(_payload JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _count INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can import career profiles';
  END IF;

  INSERT INTO public.career_profiles (
    career_name, category, short_description, career_identity,
    ideal_personality, interest_alignment, strength_alignment,
    who_should_consider, who_should_avoid, common_misconceptions,
    required_skills, advanced_skills, tools_and_technologies,
    education_paths, beginner_entry_path, six_month_growth_path,
    one_year_growth_path, portfolio_projects, career_growth_path,
    salary_reality_india, global_opportunities, future_scope,
    financial_barriers, time_commitment, common_traps,
    alternative_careers, untrap_first_step
  )
  SELECT
    c->>'career_name',
    c->>'category',
    c->>'short_description',
    c->>'career_identity',
    COALESCE(c->'ideal_personality', '{}'::jsonb),
    COALESCE(c->'interest_alignment', '[]'::jsonb),
    COALESCE(c->'strength_alignment', '[]'::jsonb),
    c->>'who_should_consider',
    c->>'who_should_avoid',
    COALESCE(c->'common_misconceptions', '[]'::jsonb),
    COALESCE(c->'required_skills', '[]'::jsonb),
    COALESCE(c->'advanced_skills', '[]'::jsonb),
    COALESCE(c->'tools_and_technologies', '[]'::jsonb),
    COALESCE(c->'education_paths', '[]'::jsonb),
    COALESCE(c->'beginner_entry_path', '[]'::jsonb),
    COALESCE(c->'six_month_growth_path', '[]'::jsonb),
    COALESCE(c->'one_year_growth_path', '[]'::jsonb),
    COALESCE(c->'portfolio_projects', '[]'::jsonb),
    COALESCE(c->'career_growth_path', '[]'::jsonb),
    COALESCE(c->'salary_reality_india', '{}'::jsonb),
    c->>'global_opportunities',
    c->>'future_scope',
    c->>'financial_barriers',
    c->>'time_commitment',
    COALESCE(c->'common_traps', '[]'::jsonb),
    COALESCE(c->'alternative_careers', '[]'::jsonb),
    c->>'untrap_first_step'
  FROM jsonb_array_elements(_payload) AS c
  WHERE c->>'career_name' IS NOT NULL
  ON CONFLICT (career_name) DO UPDATE SET
    category = EXCLUDED.category,
    short_description = EXCLUDED.short_description,
    career_identity = EXCLUDED.career_identity,
    ideal_personality = EXCLUDED.ideal_personality,
    interest_alignment = EXCLUDED.interest_alignment,
    strength_alignment = EXCLUDED.strength_alignment,
    who_should_consider = EXCLUDED.who_should_consider,
    who_should_avoid = EXCLUDED.who_should_avoid,
    common_misconceptions = EXCLUDED.common_misconceptions,
    required_skills = EXCLUDED.required_skills,
    advanced_skills = EXCLUDED.advanced_skills,
    tools_and_technologies = EXCLUDED.tools_and_technologies,
    education_paths = EXCLUDED.education_paths,
    beginner_entry_path = EXCLUDED.beginner_entry_path,
    six_month_growth_path = EXCLUDED.six_month_growth_path,
    one_year_growth_path = EXCLUDED.one_year_growth_path,
    portfolio_projects = EXCLUDED.portfolio_projects,
    career_growth_path = EXCLUDED.career_growth_path,
    salary_reality_india = EXCLUDED.salary_reality_india,
    global_opportunities = EXCLUDED.global_opportunities,
    future_scope = EXCLUDED.future_scope,
    financial_barriers = EXCLUDED.financial_barriers,
    time_commitment = EXCLUDED.time_commitment,
    common_traps = EXCLUDED.common_traps,
    alternative_careers = EXCLUDED.alternative_careers,
    untrap_first_step = EXCLUDED.untrap_first_step,
    updated_at = now();

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_career_profiles(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_career_profiles(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_career_profiles(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_career_profiles(JSONB) TO service_role;
