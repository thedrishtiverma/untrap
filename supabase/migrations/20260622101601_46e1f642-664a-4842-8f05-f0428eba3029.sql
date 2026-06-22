-- UNTRAP Moat Intelligence System: Student Moat Profile + Digital Twin
CREATE TYPE public.decision_style AS ENUM ('explorer', 'analyzer', 'executor', 'avoider');

CREATE TABLE public.student_moat_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Moat 1: Family Dynamics
  family_dynamics_score INTEGER CHECK (family_dynamics_score BETWEEN 0 AND 100),
  family_value_orientation TEXT, -- security, status, money, freedom, respect
  family_insight TEXT,
  -- Moat 2: Friend Circle
  friend_circle_score INTEGER CHECK (friend_circle_score BETWEEN 0 AND 100),
  ambition_density TEXT, -- low, medium, high
  friend_circle_insight TEXT,
  -- Moat 3: Exposure
  exposure_score INTEGER CHECK (exposure_score BETWEEN 0 AND 100),
  exposure_insight TEXT,
  -- Moat 4: Childhood Patterns
  childhood_pattern_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Moat 5: Energy
  energy_profile JSONB NOT NULL DEFAULT '{}'::jsonb, -- { energizers: [], drainers: [] }
  -- Moat 6: Decision Style
  decision_style public.decision_style,
  -- Moat 7: Fear
  fear_profile JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ fear, intensity, evidence }]
  primary_fear TEXT,
  -- Moat 8: Identity Gap
  identity_gap_score INTEGER CHECK (identity_gap_score BETWEEN 0 AND 100),
  current_identity TEXT,
  desired_identity TEXT,
  identity_bridge TEXT,
  -- Moat 9: Reality Constraints
  reality_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Moat 10: Life Story
  life_story_summary TEXT,
  -- Moat 11: Environment Upgrade
  environment_upgrade_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Moat 12: Career Experiments
  career_experiment_status JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Moat 13: Parent Bridge
  parent_bridge_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Moat 14: Mentor Memory Graph (denormalized rollup)
  mentor_memory_graph JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Moat 15: Digital Twin
  digital_twin_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Meta
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100), -- how reliable AI thinks profile is
  signal_gaps JSONB NOT NULL DEFAULT '[]'::jsonb, -- moats with low confidence -> Saarthi follow-up
  last_inferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_moat_profile TO authenticated;
GRANT ALL ON public.student_moat_profile TO service_role;
ALTER TABLE public.student_moat_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own moat profile"
  ON public.student_moat_profile FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_student_moat_profile_updated_at
  BEFORE UPDATE ON public.student_moat_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_student_moat_profile_user ON public.student_moat_profile(user_id);