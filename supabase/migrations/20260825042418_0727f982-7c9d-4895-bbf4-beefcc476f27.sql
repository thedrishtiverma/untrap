-- =========================================================
-- Layer 1 (Psychological Intelligence) content + profile
-- =========================================================

CREATE TABLE public.ae_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.ae_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.ae_questions(id) ON DELETE CASCADE,
  answer_id uuid REFERENCES public.ae_answers(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  layer_slug text NOT NULL,
  construct text NOT NULL,
  strength numeric NOT NULL CHECK (strength >= 0 AND strength <= 1),
  confidence numeric NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  weight numeric NOT NULL DEFAULT 1 CHECK (weight > 0),
  kind text NOT NULL DEFAULT 'primary',
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ae_evidence_user_layer_idx ON public.ae_evidence (user_id, layer_slug);
CREATE INDEX ae_evidence_session_idx ON public.ae_evidence (session_id);
CREATE UNIQUE INDEX ae_evidence_unique_signal ON public.ae_evidence (session_id, question_id, construct, kind);

GRANT SELECT, INSERT ON public.ae_evidence TO authenticated;
GRANT ALL ON public.ae_evidence TO service_role;
ALTER TABLE public.ae_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own evidence" ON public.ae_evidence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own evidence" ON public.ae_evidence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.student_intelligence_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.ae_sessions(id) ON DELETE SET NULL,
  layer_slug text NOT NULL,
  layer_version text NOT NULL DEFAULT 'v1.0',
  constructs jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_confidence numeric,
  evidence_count integer NOT NULL DEFAULT 0,
  dimensions_measured integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, layer_slug, version_id)
);
CREATE INDEX sip_user_idx ON public.student_intelligence_profile (user_id);

GRANT SELECT, INSERT, UPDATE ON public.student_intelligence_profile TO authenticated;
GRANT ALL ON public.student_intelligence_profile TO service_role;
ALTER TABLE public.student_intelligence_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own intelligence profile" ON public.student_intelligence_profile
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own intelligence profile" ON public.student_intelligence_profile
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own intelligence profile" ON public.student_intelligence_profile
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_sip_updated BEFORE UPDATE ON public.student_intelligence_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed Layer 1 content
-- =========================================================
DO $seed$
DECLARE
  v_version uuid;
  v_layer uuid;
  v_dim uuid;
  v_q uuid;
  v_type uuid;
  d jsonb;
  q jsonb;
  o jsonb;
  i int;
  content jsonb;
  dims jsonb;
BEGIN
  SELECT av.id INTO v_version
  FROM public.assessment_versions av
  JOIN public.assessment_definitions ad ON ad.id = av.definition_id
  WHERE ad.slug = 'untrap-core' AND av.version = 1;

  IF v_version IS NULL THEN RAISE EXCEPTION 'assessment version not found'; END IF;

  INSERT INTO public.ae_layers (version_id, order_index, slug, title, purpose, est_minutes)
  VALUES (v_version, 1, 'psychological-intelligence', 'Psychological Intelligence',
    'Estimates internal cognitive and motivational tendencies that shape how a student learns, decides, and responds to difficulty.',
    8)
  RETURNING id INTO v_layer;

  dims := '[
    ["self_efficacy","Self-Efficacy","Belief in being able to complete unfamiliar future tasks."],
    ["curiosity","Curiosity","Desire to explore new ideas and learn independently."],
    ["intrinsic_motivation","Intrinsic Motivation","Motivation driven by mastery, interest and enjoyment rather than external reward."],
    ["persistence","Persistence","Continued effort despite difficulty, delay, uncertainty or failure."],
    ["adaptability","Adaptability","Willingness to modify plans and strategies when new information appears."],
    ["reflection","Reflection","Tendency to evaluate mistakes, successes and decisions before moving forward."],
    ["future_orientation","Future Orientation","Preference for long-term rewards, planning and delayed gratification."],
    ["uncertainty_tolerance","Uncertainty Tolerance","Comfort when answers, paths or outcomes are still unclear."],
    ["achievement_orientation","Achievement Orientation","Desire to improve and master difficult work rather than simply complete it."],
    ["confidence_calibration","Confidence Calibration","Alignment between stated confidence and observed behavioural evidence."]
  ]'::jsonb;

  i := 0;
  FOR d IN SELECT * FROM jsonb_array_elements(dims) LOOP
    i := i + 1;
    INSERT INTO public.ae_dimensions (layer_id, order_index, slug, title, description)
    VALUES (v_layer, i, d->>0, d->>1, d->>2);
  END LOOP;

  content := $json$[
    {
      "slug":"l1_unfamiliar_project","dim":"self_efficacy","type":"single_choice","order":1,"required":true,
      "prompt":"A teacher offers you a project in a subject you have never studied before. Two weeks, no guidance guaranteed.",
      "description":"What would you most likely actually do?",
      "options":[
        {"value":"take_it_alone","label":"Take it and figure the subject out as I go","signals":[["self_efficacy",0.88,1],["uncertainty_tolerance",0.8,0.6],["curiosity",0.7,0.5]]},
        {"value":"take_with_support","label":"Take it, but first find someone who can guide me","signals":[["self_efficacy",0.62,1],["uncertainty_tolerance",0.55,0.6],["reflection",0.65,0.4]]},
        {"value":"ask_for_familiar","label":"Ask if I can do it in a subject I already know","signals":[["self_efficacy",0.32,1],["uncertainty_tolerance",0.3,0.6]]},
        {"value":"decline","label":"Politely pass on it this time","signals":[["self_efficacy",0.18,1],["uncertainty_tolerance",0.2,0.6]]}
      ]
    },
    {
      "slug":"l1_stuck_two_hours","dim":"persistence","type":"single_choice","order":2,"required":true,
      "prompt":"You have been stuck on the same problem for two hours. Nothing is working.",
      "description":"What usually happens next for you?",
      "options":[
        {"value":"keep_trying","label":"I keep trying different things until something moves","signals":[["persistence",0.86,1],["reflection",0.45,0.5]]},
        {"value":"step_back","label":"I stop, work out why my approach is failing, then restart","signals":[["persistence",0.72,1],["reflection",0.9,0.9]]},
        {"value":"ask_help","label":"I look for someone or something that can explain it","signals":[["persistence",0.6,1],["reflection",0.6,0.5],["adaptability",0.65,0.5]]},
        {"value":"switch_task","label":"I move to something else and often do not come back","signals":[["persistence",0.24,1],["reflection",0.3,0.5]]}
      ]
    },
    {
      "slug":"l1_persistence_probe","dim":"persistence","type":"single_choice","order":3,"required":false,
      "prompt":"When you leave something unfinished, what is usually going on?",
      "description":"There is no wrong answer here. This helps us read the last answer accurately.",
      "config":{"showIf":{"questionSlug":"l1_stuck_two_hours","op":"in","value":["switch_task"]}},
      "options":[
        {"value":"lost_interest","label":"The interest fades once the hard part starts","signals":[["persistence",0.25,1],["intrinsic_motivation",0.35,0.6]]},
        {"value":"no_time","label":"Other commitments genuinely take over","signals":[["persistence",0.5,1]]},
        {"value":"doubt","label":"I start doubting I can actually finish it","signals":[["persistence",0.35,1],["self_efficacy",0.25,0.8]]},
        {"value":"return_later","label":"I usually come back to it days later","signals":[["persistence",0.6,1],["reflection",0.6,0.5]]}
      ]
    },
    {
      "slug":"l1_recent_exploration","dim":"curiosity","type":"multiple_choice","order":4,"required":true,
      "prompt":"In the last two weeks, which of these did you actually do?",
      "description":"Select everything that genuinely happened — not what sounds good.",
      "config":{"min":0,"max":6},
      "options":[
        {"value":"rabbit_hole","label":"Fell into a rabbit hole on something unrelated to my syllabus","signals":[["curiosity",0.85,1],["intrinsic_motivation",0.7,0.6]]},
        {"value":"built_something","label":"Built, made or tried something on my own","signals":[["curiosity",0.8,0.8],["self_efficacy",0.7,0.6],["achievement_orientation",0.65,0.5]]},
        {"value":"asked_questions","label":"Asked someone to explain how something really works","signals":[["curiosity",0.75,0.8],["reflection",0.55,0.4]]},
        {"value":"studied_for_marks","label":"Studied mainly for marks or an exam","signals":[["intrinsic_motivation",0.35,0.6],["achievement_orientation",0.5,0.4]]},
        {"value":"planned_ahead","label":"Planned something for a few months from now","signals":[["future_orientation",0.75,0.7]]},
        {"value":"none","label":"Honestly, none of these","signals":[["curiosity",0.25,0.8]]}
      ]
    },
    {
      "slug":"l1_course_tradeoff","dim":"intrinsic_motivation","type":"single_choice","order":5,"required":true,
      "prompt":"Two free courses. Same effort, same time. You can pick only one.",
      "description":"Course A gives a certificate that looks good on your CV. Course B gives no certificate but teaches something you have been curious about.",
      "options":[
        {"value":"b_strong","label":"Course B, without much hesitation","signals":[["intrinsic_motivation",0.9,1],["curiosity",0.8,0.7]]},
        {"value":"b_reluctant","label":"Course B, but I would feel a bit guilty about the certificate","signals":[["intrinsic_motivation",0.68,1],["curiosity",0.65,0.6]]},
        {"value":"a_reluctant","label":"Course A, because visible proof matters right now","signals":[["intrinsic_motivation",0.38,1],["future_orientation",0.6,0.4]]},
        {"value":"a_strong","label":"Course A, clearly","signals":[["intrinsic_motivation",0.22,1]]}
      ]
    },
    {
      "slug":"l1_after_setback","dim":"reflection","type":"single_choice","order":6,"required":true,
      "prompt":"You prepared properly for a test and still scored badly.",
      "description":"What is the first thing you do afterwards?",
      "options":[
        {"value":"analyse","label":"Go through it and work out exactly where it went wrong","signals":[["reflection",0.9,1],["self_efficacy",0.7,0.5],["persistence",0.7,0.5]]},
        {"value":"redo_plan","label":"Change how I prepare for the next one","signals":[["reflection",0.78,1],["adaptability",0.8,0.7]]},
        {"value":"push_harder","label":"Just decide to work harder next time","signals":[["reflection",0.45,1],["persistence",0.7,0.5]]},
        {"value":"avoid","label":"Try not to think about it for a while","signals":[["reflection",0.25,1],["self_efficacy",0.35,0.5]]}
      ]
    },
    {
      "slug":"l1_plan_disrupted","dim":"adaptability","type":"single_choice","order":7,"required":true,
      "prompt":"Halfway through a plan you were committed to, you learn a better route exists.",
      "description":"Switching means losing some of the work you already did.",
      "options":[
        {"value":"switch_now","label":"Switch — the sunk work matters less than the better route","signals":[["adaptability",0.88,1],["reflection",0.65,0.5]]},
        {"value":"verify_then_switch","label":"Check how much better it really is, then decide","signals":[["adaptability",0.7,1],["reflection",0.85,0.7]]},
        {"value":"finish_then_switch","label":"Finish what I started, use the new route next time","signals":[["adaptability",0.42,1],["persistence",0.75,0.5]]},
        {"value":"stay","label":"Stay with my plan — changing mid-way unsettles me","signals":[["adaptability",0.22,1],["uncertainty_tolerance",0.35,0.5]]}
      ]
    },
    {
      "slug":"l1_unclear_future","dim":"uncertainty_tolerance","type":"slider","order":8,"required":true,
      "prompt":"Right now, how okay do you feel about not knowing exactly where your career is heading?",
      "description":"Move the slider to wherever you honestly are today.",
      "config":{"min":0,"max":100,"step":5,"default":50,"leftLabel":"It genuinely unsettles me","rightLabel":"I am comfortable figuring it out as I go","signals":[["uncertainty_tolerance",1,"linear"],["adaptability",0.4,"linear"]]}
    },
    {
      "slug":"l1_uncertainty_probe","dim":"uncertainty_tolerance","type":"single_choice","order":9,"required":false,
      "prompt":"When the path ahead is unclear, what bothers you most?",
      "description":"Knowing this helps us support you better later.",
      "config":{"showIf":{"questionSlug":"l1_unclear_future","op":"lte","value":35}},
      "options":[
        {"value":"wasting_time","label":"That I might waste years on the wrong thing","signals":[["uncertainty_tolerance",0.3,1],["future_orientation",0.7,0.5]]},
        {"value":"others_ahead","label":"That people around me seem to have it figured out","signals":[["uncertainty_tolerance",0.28,1],["self_efficacy",0.4,0.5]]},
        {"value":"family","label":"That people at home need a clear answer from me","signals":[["uncertainty_tolerance",0.35,1]]},
        {"value":"no_first_step","label":"That I do not know what the first step even is","signals":[["uncertainty_tolerance",0.32,1],["self_efficacy",0.35,0.6]]}
      ]
    },
    {
      "slug":"l1_delayed_reward","dim":"future_orientation","type":"single_choice","order":10,"required":true,
      "prompt":"Two options land on the same day.",
      "description":"A small paid gig you can start this week, or an unpaid six-month programme that builds a skill you would still be using in five years.",
      "options":[
        {"value":"programme","label":"The six-month programme","signals":[["future_orientation",0.88,1],["intrinsic_motivation",0.7,0.5]]},
        {"value":"both","label":"Try to do both, even if it is heavy","signals":[["future_orientation",0.7,1],["persistence",0.75,0.5],["achievement_orientation",0.7,0.5]]},
        {"value":"gig","label":"The paid gig — money now matters","signals":[["future_orientation",0.35,1]]},
        {"value":"gig_needed","label":"The paid gig, because I do not really have a choice","signals":[["future_orientation",0.5,0.6]]}
      ]
    },
    {
      "slug":"l1_hard_vs_easy","dim":"achievement_orientation","type":"single_choice","order":11,"required":true,
      "prompt":"Two electives. One is difficult and you would probably land a middling grade. The other is easy and an easy top grade.",
      "description":"Which do you pick?",
      "options":[
        {"value":"hard","label":"The difficult one — I want to actually get better","signals":[["achievement_orientation",0.88,1],["self_efficacy",0.7,0.5],["uncertainty_tolerance",0.65,0.4]]},
        {"value":"hard_if_support","label":"The difficult one, if I had some support","signals":[["achievement_orientation",0.68,1],["self_efficacy",0.5,0.5]]},
        {"value":"easy_grade","label":"The easy one — my grades carry real weight right now","signals":[["achievement_orientation",0.4,1],["future_orientation",0.55,0.3]]},
        {"value":"easy","label":"The easy one","signals":[["achievement_orientation",0.25,1]]}
      ]
    },
    {
      "slug":"l1_priorities_rank","dim":"intrinsic_motivation","type":"priority_ranking","order":12,"required":true,
      "prompt":"Order these by what actually matters to you over the next two years.",
      "description":"Drag or use the arrows. Top means most important.",
      "config":{"rankSignals":{
        "mastery":[["intrinsic_motivation",0.9,1],["achievement_orientation",0.8,0.7]],
        "stability":[["future_orientation",0.7,0.7],["uncertainty_tolerance",0.35,0.5]],
        "recognition":[["achievement_orientation",0.6,0.5],["intrinsic_motivation",0.3,0.6]],
        "freedom":[["uncertainty_tolerance",0.75,0.6],["curiosity",0.7,0.6]],
        "impact":[["intrinsic_motivation",0.7,0.6],["future_orientation",0.65,0.5]]
      }},
      "options":[
        {"value":"mastery","label":"Getting genuinely good at something"},
        {"value":"stability","label":"A secure, predictable path"},
        {"value":"recognition","label":"Being recognised for my work"},
        {"value":"freedom","label":"Freedom to choose what I work on"},
        {"value":"impact","label":"Work that visibly helps people"}
      ]
    },
    {
      "slug":"l1_feedback_response","dim":"reflection","type":"single_choice","order":13,"required":true,
      "prompt":"Someone whose opinion you respect points out a real flaw in your work.",
      "description":"What happens inside you first?",
      "options":[
        {"value":"curious","label":"I want the details so I can fix it","signals":[["reflection",0.88,1],["adaptability",0.8,0.7],["achievement_orientation",0.7,0.5]]},
        {"value":"defensive_then_use","label":"I feel defensive briefly, then use it","signals":[["reflection",0.72,1],["adaptability",0.65,0.7]]},
        {"value":"discouraged","label":"It knocks my confidence for a while","signals":[["reflection",0.5,1],["self_efficacy",0.35,0.7]]},
        {"value":"dismiss","label":"I usually decide they misread my work","signals":[["reflection",0.28,1],["adaptability",0.3,0.7]]}
      ]
    },
    {
      "slug":"l1_first_step","dim":"self_efficacy","type":"single_choice","order":14,"required":true,
      "prompt":"You decide to learn something completely new next month. No one is telling you how.",
      "description":"How does it usually begin?",
      "options":[
        {"value":"experiment","label":"I start experimenting and correct course as I learn","signals":[["self_efficacy",0.85,1],["curiosity",0.8,0.6],["uncertainty_tolerance",0.75,0.5]]},
        {"value":"structure","label":"I find a proper structure or course first","signals":[["self_efficacy",0.65,1],["future_orientation",0.7,0.4],["reflection",0.6,0.4]]},
        {"value":"find_person","label":"I look for a person doing it and follow their path","signals":[["self_efficacy",0.5,1],["adaptability",0.6,0.4]]},
        {"value":"stall","label":"I plan it for weeks and often do not begin","signals":[["self_efficacy",0.28,1],["persistence",0.35,0.6]]}
      ]
    },
    {
      "slug":"l1_confidence_selfreport","dim":"confidence_calibration","type":"slider","order":15,"required":true,
      "prompt":"How confident are you that you could learn a demanding new skill from scratch this year?",
      "description":"Just your honest sense of it.",
      "config":{"min":0,"max":100,"step":5,"default":50,"leftLabel":"Not confident","rightLabel":"Very confident","signals":[["self_reported_confidence",1,"linear"]]}
    },
    {
      "slug":"l1_track_record","dim":"confidence_calibration","type":"single_choice","order":16,"required":true,
      "prompt":"Think about the last three things you started entirely on your own.",
      "description":"How many did you carry to something you would call finished?",
      "options":[
        {"value":"three","label":"All three","signals":[["behavioural_followthrough",0.9,1],["persistence",0.85,0.8]]},
        {"value":"two","label":"Two of them","signals":[["behavioural_followthrough",0.68,1],["persistence",0.68,0.8]]},
        {"value":"one","label":"One of them","signals":[["behavioural_followthrough",0.4,1],["persistence",0.42,0.8]]},
        {"value":"none","label":"None, so far","signals":[["behavioural_followthrough",0.18,1],["persistence",0.25,0.8]]}
      ]
    },
    {
      "slug":"l1_reflection_note","dim":"reflection","type":"reflection","order":17,"required":false,
      "prompt":"Anything you would want a mentor to know about where you are right now?",
      "description":"Optional. A sentence or two is plenty — you can skip this.",
      "config":{"maxLength":500,"rows":4}
    }
  ]$json$::jsonb;

  FOR q IN SELECT * FROM jsonb_array_elements(content) LOOP
    SELECT id INTO v_type FROM public.ae_question_types WHERE slug = q->>'type';
    IF v_type IS NULL THEN RAISE EXCEPTION 'unknown question type %', q->>'type'; END IF;
    SELECT id INTO v_dim FROM public.ae_dimensions WHERE layer_id = v_layer AND slug = q->>'dim';

    INSERT INTO public.ae_questions
      (version_id, layer_id, dimension_id, order_index, slug, type_id, prompt, description, helper, required, config, a11y)
    VALUES (
      v_version, v_layer, v_dim, (q->>'order')::int, q->>'slug', v_type,
      jsonb_build_object('en', q->>'prompt'),
      CASE WHEN q ? 'description' THEN jsonb_build_object('en', q->>'description') ELSE NULL END,
      NULL,
      COALESCE((q->>'required')::boolean, true),
      COALESCE(q->'config', '{}'::jsonb),
      '{}'::jsonb
    )
    RETURNING id INTO v_q;

    i := 0;
    FOR o IN SELECT * FROM jsonb_array_elements(COALESCE(q->'options', '[]'::jsonb)) LOOP
      i := i + 1;
      INSERT INTO public.ae_question_options (question_id, order_index, label, value, meta)
      VALUES (
        v_q, i, jsonb_build_object('en', o->>'label'), o->>'value',
        CASE WHEN o ? 'signals' THEN jsonb_build_object('signals', o->'signals') ELSE '{}'::jsonb END
      );
    END LOOP;
  END LOOP;

  UPDATE public.assessment_versions
  SET is_published = true, published_at = now()
  WHERE id = v_version;
END
$seed$;