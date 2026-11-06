-- Keep authenticated career-match reads while preventing callers from writing scores directly.
DROP POLICY IF EXISTS "own matches" ON public.career_matches;
CREATE POLICY "owners read career matches" ON public.career_matches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owners delete career matches" ON public.career_matches
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.career_matches FROM authenticated;
GRANT SELECT, DELETE ON public.career_matches TO authenticated;

-- Assessment content is visible only when attached to a published assessment version.
CREATE OR REPLACE FUNCTION private.is_published_assessment_version(_version_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assessment_versions v WHERE v.id = _version_id AND v.is_published)
$$;
CREATE OR REPLACE FUNCTION private.is_published_assessment_layer(_layer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ae_layers l
    JOIN public.assessment_versions v ON v.id = l.version_id
    WHERE l.id = _layer_id AND v.is_published
  )
$$;
CREATE OR REPLACE FUNCTION private.is_published_assessment_question(_question_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ae_questions q
    JOIN public.assessment_versions v ON v.id = q.version_id
    WHERE q.id = _question_id AND v.is_published
  )
$$;
CREATE OR REPLACE FUNCTION private.is_published_assessment_type(_type_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ae_questions q
    JOIN public.assessment_versions v ON v.id = q.version_id
    WHERE q.type_id = _type_id AND v.is_published
  )
$$;
CREATE OR REPLACE FUNCTION private.has_published_assessment_definition(_definition_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_versions v
    WHERE v.definition_id = _definition_id AND v.is_published
  )
$$;
GRANT EXECUTE ON FUNCTION private.is_published_assessment_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_published_assessment_layer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_published_assessment_question(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_published_assessment_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_published_assessment_definition(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read branch rules" ON public.ae_branch_rules;
CREATE POLICY "Authenticated read branch rules" ON public.ae_branch_rules FOR SELECT TO authenticated
  USING (private.is_published_assessment_version(version_id));
DROP POLICY IF EXISTS "Authenticated read questions" ON public.ae_questions;
CREATE POLICY "Authenticated read questions" ON public.ae_questions FOR SELECT TO authenticated
  USING (private.is_published_assessment_version(version_id));
DROP POLICY IF EXISTS "Authenticated read options" ON public.ae_question_options;
CREATE POLICY "Authenticated read options" ON public.ae_question_options FOR SELECT TO authenticated
  USING (private.is_published_assessment_question(question_id));
DROP POLICY IF EXISTS "Authenticated read question types" ON public.ae_question_types;
CREATE POLICY "Authenticated read question types" ON public.ae_question_types FOR SELECT TO authenticated
  USING (private.is_published_assessment_type(id));
DROP POLICY IF EXISTS "Authenticated read dimensions" ON public.ae_dimensions;
CREATE POLICY "Authenticated read dimensions" ON public.ae_dimensions FOR SELECT TO authenticated
  USING (private.is_published_assessment_layer(layer_id));
DROP POLICY IF EXISTS "Authenticated read layers" ON public.ae_layers;
CREATE POLICY "Authenticated read layers" ON public.ae_layers FOR SELECT TO authenticated
  USING (private.is_published_assessment_version(version_id));
DROP POLICY IF EXISTS "Authenticated can read definitions" ON public.assessment_definitions;
CREATE POLICY "Authenticated can read definitions" ON public.assessment_definitions FOR SELECT TO authenticated
  USING (private.has_published_assessment_definition(id));
DROP POLICY IF EXISTS "questions readable" ON public.assessment_questions;
CREATE POLICY "questions readable" ON public.assessment_questions FOR SELECT TO authenticated
  USING (active_status = true);

-- Restrict reusable vocational catalogue rows to data linked to published trades.
CREATE OR REPLACE FUNCTION private.is_published_vocational_trade(_trade_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vocational_trades t WHERE t.id = _trade_id AND t.is_published)
$$;
CREATE OR REPLACE FUNCTION private.is_public_vocational_qualification(_qualification_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vocational_trades t
    WHERE t.qualification_id = _qualification_id AND t.is_published
  )
$$;
CREATE OR REPLACE FUNCTION private.is_public_vocational_location(_location_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vocational_outcome_metrics m
    JOIN public.vocational_trades t ON t.id = m.trade_id
    WHERE m.location_id = _location_id AND m.verification_status = 'verified' AND t.is_published
  ) OR EXISTS (
    SELECT 1 FROM public.vocational_training_providers p
    JOIN public.vocational_trades t ON t.id = p.trade_id
    WHERE p.location_id = _location_id AND p.verification_status = 'verified' AND t.is_published
  )
$$;
GRANT EXECUTE ON FUNCTION private.is_published_vocational_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_public_vocational_qualification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_public_vocational_location(uuid) TO authenticated;

DROP POLICY IF EXISTS "read progression" ON public.vocational_progression_pathways;
CREATE POLICY "read progression" ON public.vocational_progression_pathways FOR SELECT TO authenticated
  USING (private.is_published_vocational_trade(trade_id));
DROP POLICY IF EXISTS "read job roles" ON public.vocational_job_roles;
CREATE POLICY "read job roles" ON public.vocational_job_roles FOR SELECT TO authenticated
  USING (private.is_published_vocational_trade(trade_id));
DROP POLICY IF EXISTS "read locations" ON public.vocational_locations;
CREATE POLICY "read locations" ON public.vocational_locations FOR SELECT TO authenticated
  USING (private.is_public_vocational_location(id) OR private.is_vocational_staff(auth.uid()));
DROP POLICY IF EXISTS "read qualifications" ON public.vocational_qualifications;
CREATE POLICY "read qualifications" ON public.vocational_qualifications FOR SELECT TO authenticated
  USING (private.is_public_vocational_qualification(id) OR private.is_vocational_staff(auth.uid()));

-- These career catalogues are available to signed-in app users, not anonymous visitors.
DROP POLICY IF EXISTS "traps public read" ON public.career_traps;
CREATE POLICY "traps public read" ON public.career_traps FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "careers public read" ON public.careers;
CREATE POLICY "careers public read" ON public.careers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can read career profiles" ON public.career_profiles;
CREATE POLICY "Authenticated users can read career profiles" ON public.career_profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "templates public read" ON public.roadmap_templates;
CREATE POLICY "templates public read" ON public.roadmap_templates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
-- Knowledge base is not used by current student flows; leave it admin-only.
DROP POLICY IF EXISTS "kb authenticated read" ON public.knowledge_base;
-- Prompt templates are server-only; admin management policy remains the only authenticated policy.
DROP POLICY IF EXISTS "Anyone signed in can read prompts" ON public.ai_prompts;

-- Prevent a revoked family-room participant from restoring membership with an old invite.
ALTER TABLE public.vocational_decision_participants ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE OR REPLACE FUNCTION private.is_decision_member(_decision uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vocational_decisions WHERE id = _decision AND owner_user_id = _uid)
    OR EXISTS (
      SELECT 1 FROM public.vocational_decision_participants
      WHERE decision_id = _decision AND user_id = _uid AND revoked_at IS NULL
    )
$$;
CREATE OR REPLACE FUNCTION public.join_vocational_decision(_invite_code uuid, _participant_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _participant_role NOT IN ('learner','parent') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT id INTO _id FROM public.vocational_decisions WHERE invite_code = _invite_code;
  IF _id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.vocational_decision_participants
    WHERE decision_id = _id AND user_id = auth.uid() AND revoked_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Access to this decision has been revoked'; END IF;
  INSERT INTO public.vocational_decision_participants (decision_id, user_id, participant_role)
  VALUES (_id, auth.uid(), _participant_role)
  ON CONFLICT (decision_id, user_id) DO UPDATE SET participant_role = EXCLUDED.participant_role;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.join_vocational_decision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_vocational_decision(uuid, text) TO authenticated;
DROP POLICY IF EXISTS "members view participants" ON public.vocational_decision_participants;
CREATE POLICY "members view participants" ON public.vocational_decision_participants FOR SELECT TO authenticated
  USING (
    (revoked_at IS NULL AND private.is_decision_member(decision_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.vocational_decisions d WHERE d.id = decision_id AND d.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "leave or owner removes" ON public.vocational_decision_participants;
REVOKE DELETE ON public.vocational_decision_participants FROM authenticated;
CREATE OR REPLACE FUNCTION public.revoke_vocational_decision_participant(_decision_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT owner_user_id INTO _owner FROM public.vocational_decisions WHERE id = _decision_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Decision not found'; END IF;
  IF _user_id <> auth.uid() AND _owner <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _user_id = _owner THEN RAISE EXCEPTION 'The room owner cannot leave their own decision'; END IF;
  UPDATE public.vocational_decision_participants
    SET revoked_at = COALESCE(revoked_at, now())
    WHERE decision_id = _decision_id AND user_id = _user_id;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.revoke_vocational_decision_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_vocational_decision_participant(uuid, uuid) TO authenticated;