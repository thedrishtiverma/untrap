CREATE TABLE public.vocational_staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('counsellor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.vocational_staff_roles TO authenticated;
GRANT ALL ON public.vocational_staff_roles TO service_role;
ALTER TABLE public.vocational_staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own staff role" ON public.vocational_staff_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins manage staff roles" ON public.vocational_staff_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION private.is_vocational_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(_uid, 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.vocational_staff_roles WHERE user_id = _uid AND role = 'counsellor')
$$;
GRANT EXECUTE ON FUNCTION private.is_vocational_staff(uuid) TO authenticated;

CREATE TABLE public.vocational_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_url text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','pending','unavailable')),
  collected_at date,
  last_updated date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_data_sources TO authenticated;
GRANT ALL ON public.vocational_data_sources TO service_role;
ALTER TABLE public.vocational_data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read verified sources" ON public.vocational_data_sources FOR SELECT TO authenticated USING (verification_status = 'verified' OR private.is_vocational_staff(auth.uid()));
CREATE POLICY "staff manage sources" ON public.vocational_data_sources FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  awarding_body text,
  nsqf_level integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_qualifications TO authenticated;
GRANT ALL ON public.vocational_qualifications TO service_role;
ALTER TABLE public.vocational_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read qualifications" ON public.vocational_qualifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage qualifications" ON public.vocational_qualifications FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_hi text,
  sector text,
  description text,
  description_hi text,
  who_it_may_suit text,
  education_background text,
  training_duration text,
  qualification_id uuid REFERENCES public.vocational_qualifications(id) ON DELETE SET NULL,
  nsqf_level integer,
  safety_information text,
  work_environment text,
  misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_trades TO authenticated;
GRANT ALL ON public.vocational_trades TO service_role;
ALTER TABLE public.vocational_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published trades" ON public.vocational_trades FOR SELECT TO authenticated USING (is_published OR private.is_vocational_staff(auth.uid()));
CREATE POLICY "staff manage trades" ON public.vocational_trades FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  district text,
  area_type text CHECK (area_type IN ('rural','semiurban','urban')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_locations TO authenticated;
GRANT ALL ON public.vocational_locations TO service_role;
ALTER TABLE public.vocational_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read locations" ON public.vocational_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage locations" ON public.vocational_locations FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_training_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.vocational_trades(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_id uuid REFERENCES public.vocational_locations(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.vocational_data_sources(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','pending','unavailable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_training_providers TO authenticated;
GRANT ALL ON public.vocational_training_providers TO service_role;
ALTER TABLE public.vocational_training_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read verified providers" ON public.vocational_training_providers FOR SELECT TO authenticated USING (verification_status = 'verified' OR private.is_vocational_staff(auth.uid()));
CREATE POLICY "staff manage providers" ON public.vocational_training_providers FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.vocational_trades(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_job_roles TO authenticated;
GRANT ALL ON public.vocational_job_roles TO service_role;
ALTER TABLE public.vocational_job_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read job roles" ON public.vocational_job_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage job roles" ON public.vocational_job_roles FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_progression_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.vocational_trades(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  stage text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, order_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_progression_pathways TO authenticated;
GRANT ALL ON public.vocational_progression_pathways TO service_role;
ALTER TABLE public.vocational_progression_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read progression" ON public.vocational_progression_pathways FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage progression" ON public.vocational_progression_pathways FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_outcome_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.vocational_trades(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.vocational_locations(id) ON DELETE SET NULL,
  source_id uuid NOT NULL REFERENCES public.vocational_data_sources(id) ON DELETE RESTRICT,
  metric_type text NOT NULL,
  label text NOT NULL,
  value_text text NOT NULL,
  last_updated date NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','pending','unavailable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_outcome_metrics TO authenticated;
GRANT ALL ON public.vocational_outcome_metrics TO service_role;
ALTER TABLE public.vocational_outcome_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read verified metrics" ON public.vocational_outcome_metrics FOR SELECT TO authenticated USING (verification_status = 'verified' OR private.is_vocational_staff(auth.uid()));
CREATE POLICY "staff manage metrics" ON public.vocational_outcome_metrics FOR ALL TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE TABLE public.vocational_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  invite_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  title text NOT NULL DEFAULT 'Family career decision',
  learner_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  parent_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  learner_notes text,
  parent_notes text,
  shortlisted_trade_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','resolved','needs_counsellor','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vocational_decision_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.vocational_decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  participant_role text NOT NULL CHECK (participant_role IN ('learner','parent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, user_id)
);

CREATE OR REPLACE FUNCTION private.is_decision_member(_decision uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vocational_decisions WHERE id = _decision AND owner_user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.vocational_decision_participants WHERE decision_id = _decision AND user_id = _uid)
$$;
GRANT EXECUTE ON FUNCTION private.is_decision_member(uuid, uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocational_decisions TO authenticated;
GRANT ALL ON public.vocational_decisions TO service_role;
ALTER TABLE public.vocational_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view decisions" ON public.vocational_decisions FOR SELECT TO authenticated USING (private.is_decision_member(id, auth.uid()));
CREATE POLICY "create own decisions" ON public.vocational_decisions FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "members update decisions" ON public.vocational_decisions FOR UPDATE TO authenticated USING (private.is_decision_member(id, auth.uid())) WITH CHECK (private.is_decision_member(id, auth.uid()));
CREATE POLICY "owners delete decisions" ON public.vocational_decisions FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

GRANT SELECT, DELETE ON public.vocational_decision_participants TO authenticated;
GRANT ALL ON public.vocational_decision_participants TO service_role;
ALTER TABLE public.vocational_decision_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view participants" ON public.vocational_decision_participants FOR SELECT TO authenticated USING (private.is_decision_member(decision_id, auth.uid()));
CREATE POLICY "leave or owner removes" ON public.vocational_decision_participants FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vocational_decisions d WHERE d.id = decision_id AND d.owner_user_id = auth.uid()));

CREATE TABLE public.vocational_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.vocational_decisions(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  concern_category text NOT NULL,
  concern_text text NOT NULL,
  ai_response jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','still_concerned','needs_counsellor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vocational_concerns TO authenticated;
GRANT ALL ON public.vocational_concerns TO service_role;
ALTER TABLE public.vocational_concerns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view concerns" ON public.vocational_concerns FOR SELECT TO authenticated USING (private.is_decision_member(decision_id, auth.uid()));
CREATE POLICY "members raise concerns" ON public.vocational_concerns FOR INSERT TO authenticated WITH CHECK (raised_by = auth.uid() AND private.is_decision_member(decision_id, auth.uid()));
CREATE POLICY "members update concerns" ON public.vocational_concerns FOR UPDATE TO authenticated USING (private.is_decision_member(decision_id, auth.uid())) WITH CHECK (private.is_decision_member(decision_id, auth.uid()));

CREATE TABLE public.vocational_saved_trades (
  user_id uuid NOT NULL,
  trade_id uuid NOT NULL REFERENCES public.vocational_trades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trade_id)
);
GRANT SELECT, INSERT, DELETE ON public.vocational_saved_trades TO authenticated;
GRANT ALL ON public.vocational_saved_trades TO service_role;
ALTER TABLE public.vocational_saved_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved trades" ON public.vocational_saved_trades FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.vocational_counsellor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES public.vocational_decisions(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  requester_role text NOT NULL DEFAULT 'learner' CHECK (requester_role IN ('learner','parent')),
  topic text NOT NULL,
  concern_category text,
  conversation_summary text,
  trade_id uuid REFERENCES public.vocational_trades(id) ON DELETE SET NULL,
  location_text text,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_counsellor_id uuid,
  resolution_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vocational_counsellor_requests TO authenticated;
GRANT ALL ON public.vocational_counsellor_requests TO service_role;
ALTER TABLE public.vocational_counsellor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own or staff requests" ON public.vocational_counsellor_requests FOR SELECT TO authenticated USING (requested_by = auth.uid() OR private.is_vocational_staff(auth.uid()));
CREATE POLICY "create own requests" ON public.vocational_counsellor_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid() AND status = 'open' AND assigned_counsellor_id IS NULL AND (decision_id IS NULL OR private.is_decision_member(decision_id, auth.uid())));
CREATE POLICY "staff update requests" ON public.vocational_counsellor_requests FOR UPDATE TO authenticated USING (private.is_vocational_staff(auth.uid())) WITH CHECK (private.is_vocational_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.join_vocational_decision(_invite_code uuid, _participant_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _participant_role NOT IN ('learner','parent') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT id INTO _id FROM public.vocational_decisions WHERE invite_code = _invite_code;
  IF _id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  INSERT INTO public.vocational_decision_participants (decision_id, user_id, participant_role)
  VALUES (_id, auth.uid(), _participant_role)
  ON CONFLICT (decision_id, user_id) DO UPDATE SET participant_role = EXCLUDED.participant_role;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.join_vocational_decision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_vocational_decision(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vocational_insights()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN jsonb_build_object(
    'decisions', (SELECT count(*) FROM public.vocational_decisions),
    'decisions_by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}') FROM (SELECT status, count(*) n FROM public.vocational_decisions GROUP BY status) s),
    'concerns_by_category', (SELECT coalesce(jsonb_object_agg(concern_category, n), '{}') FROM (SELECT concern_category, count(*) n FROM public.vocational_concerns GROUP BY concern_category) s),
    'concerns_by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}') FROM (SELECT status, count(*) n FROM public.vocational_concerns GROUP BY status) s),
    'requests_by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}') FROM (SELECT status, count(*) n FROM public.vocational_counsellor_requests GROUP BY status) s),
    'top_saved_trades', (SELECT coalesce(jsonb_agg(x), '[]') FROM (SELECT t.name, count(*) n FROM public.vocational_saved_trades st JOIN public.vocational_trades t ON t.id = st.trade_id GROUP BY t.name ORDER BY n DESC LIMIT 5) x),
    'verified_metrics', (SELECT count(*) FROM public.vocational_outcome_metrics WHERE verification_status = 'verified'),
    'pending_metrics', (SELECT count(*) FROM public.vocational_outcome_metrics WHERE verification_status = 'pending')
  );
END $$;
REVOKE ALL ON FUNCTION public.vocational_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vocational_insights() TO authenticated;

CREATE TRIGGER trg_voc_trades_updated BEFORE UPDATE ON public.vocational_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_voc_decisions_updated BEFORE UPDATE ON public.vocational_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_voc_concerns_updated BEFORE UPDATE ON public.vocational_concerns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_voc_requests_updated BEFORE UPDATE ON public.vocational_counsellor_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_voc_participants_user ON public.vocational_decision_participants(user_id);
CREATE INDEX idx_voc_decisions_owner ON public.vocational_decisions(owner_user_id);

INSERT INTO public.vocational_qualifications (name, awarding_body, nsqf_level, description) VALUES
('ITI Electrician (CTS)', 'NCVT / DGT', 5, 'Two-year Craftsmen Training Scheme certificate.'),
('ITI Fitter (CTS)', 'NCVT / DGT', 5, 'Two-year Craftsmen Training Scheme certificate.'),
('General Duty Assistant', 'Healthcare Sector Skill Council', 4, 'Short-term healthcare support qualification.'),
('Assistant Beauty Therapist', 'Beauty & Wellness Sector Skill Council', 3, 'Entry-level beauty and wellness qualification.'),
('Automotive Service Technician', 'Automotive Skills Development Council', 4, 'Two-wheeler / four-wheeler service qualification.');

INSERT INTO public.vocational_trades (slug, name, name_hi, sector, description, description_hi, who_it_may_suit, education_background, training_duration, qualification_id, nsqf_level, safety_information, work_environment, misconceptions)
SELECT v.slug, v.name, v.name_hi, v.sector, v.description, v.description_hi, v.suits, v.edu, v.dur, q.id, q.nsqf_level, v.safety, v.env, v.myths::jsonb
FROM (VALUES
 ('electrician','Electrician','इलेक्ट्रीशियन','Power & Construction','Installs, maintains and repairs electrical wiring and equipment in homes, buildings and industry.','घरों, इमारतों और उद्योगों में बिजली की वायरिंग और उपकरण लगाना और ठीक करना।','People who like hands-on, careful, practical problem solving.','Usually Class 10 pass for ITI admission (check the institute).','About 2 years (ITI)','ITI Electrician (CTS)','Work involves live electrical systems; formal safety training and protective equipment are essential.','Construction sites, homes, factories, maintenance teams; some field travel.','["It is only a low-skill job","There is no way to study further after ITI"]'),
 ('fitter','Fitter','फिटर','Manufacturing','Assembles, fits and maintains machine parts and mechanical systems.','मशीन के पुर्जों को जोड़ना, फिट करना और रखरखाव करना।','People who enjoy machines, measurement and precise work.','Usually Class 10 pass for ITI admission (check the institute).','About 2 years (ITI)','ITI Fitter (CTS)','Workshop safety rules and protective gear are required around machinery.','Factories, workshops, railways, maintenance units.','["Only men can do this work"]'),
 ('general-duty-assistant','General Duty Assistant','जनरल ड्यूटी असिस्टेंट','Healthcare','Supports nurses and patients with daily care in hospitals and care settings.','अस्पतालों में नर्सों और मरीजों की दैनिक देखभाल में मदद।','People who are caring, patient and comfortable around patients.','Usually Class 10 pass (check the training centre).','A few months (short-term course)','General Duty Assistant','Infection-control training is part of the course; shift work is common.','Hospitals, nursing homes, home care.','["It has no growth path"]'),
 ('beauty-therapist','Assistant Beauty Therapist','सहायक ब्यूटी थेरेपिस्ट','Beauty & Wellness','Provides basic skin, hair and beauty services to clients.','ग्राहकों को त्वचा, बाल और सौंदर्य की बुनियादी सेवाएं देना।','People who enjoy working with people and have an eye for detail.','Usually Class 8–10 (check the training centre).','A few months (short-term course)','Assistant Beauty Therapist','Hygiene and safe product handling are taught in training.','Salons, spas, self-employment from home or a shop.','["It is not a respectable career"]'),
 ('automotive-technician','Automotive Service Technician','ऑटोमोटिव सर्विस टेक्नीशियन','Automotive','Diagnoses and services two-wheelers and cars.','दोपहिया और कारों की जांच और सर्विस करना।','People who like vehicles, tools and troubleshooting.','Usually Class 10 (check the training centre).','A few months to 1 year','Automotive Service Technician','Workshop safety and handling of tools and fluids are part of training.','Service centres, dealerships, own garage.','["Mechanics cannot progress beyond a garage job"]')
) AS v(slug,name,name_hi,sector,description,description_hi,suits,edu,dur,qual,safety,env,myths)
JOIN public.vocational_qualifications q ON q.name = v.qual;

INSERT INTO public.vocational_job_roles (trade_id, title)
SELECT t.id, r.title FROM public.vocational_trades t JOIN (VALUES
 ('electrician','Wireman'),('electrician','Maintenance Electrician'),('electrician','Electrical Contractor (self-employed)'),
 ('fitter','Machine Fitter'),('fitter','Maintenance Technician'),
 ('general-duty-assistant','Patient Care Assistant'),('general-duty-assistant','Home Health Aide'),
 ('beauty-therapist','Salon Assistant'),('beauty-therapist','Salon Owner (self-employed)'),
 ('automotive-technician','Service Technician'),('automotive-technician','Garage Owner (self-employed)')
) AS r(slug,title) ON r.slug = t.slug;

INSERT INTO public.vocational_progression_pathways (trade_id, order_index, stage, explanation)
SELECT t.id, p.i, p.stage, p.expl FROM public.vocational_trades t CROSS JOIN (VALUES
 (1,'Training','Join a recognised course and earn a certificate.'),
 (2,'Entry job or apprenticeship','Start work or an apprenticeship to gain real experience.'),
 (3,'Skilled worker','With experience, take on more complex work and responsibility.'),
 (4,'Supervisor or own business','Lead a team, or start your own service business.'),
 (5,'Further study','Higher NSQF courses, diploma or degree pathways may be available — check eligibility.')
) AS p(i,stage,expl);
