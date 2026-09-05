DO $migration$
DECLARE
  v_version uuid;
  v_layer uuid;
  v_dim uuid;
  v_q uuid;
  v_type uuid;
  q jsonb;
  o jsonb;
  i int;
  content jsonb;
BEGIN
  SELECT av.id, al.id
    INTO v_version, v_layer
  FROM public.assessment_versions av
  JOIN public.assessment_definitions ad ON ad.id = av.definition_id
  JOIN public.ae_layers al ON al.version_id = av.id
  WHERE ad.slug = 'untrap-core'
    AND av.version = 1
    AND al.slug = 'psychological-intelligence';

  IF v_version IS NULL OR v_layer IS NULL THEN
    RAISE EXCEPTION 'published Layer 1 assessment not found';
  END IF;

  UPDATE public.ae_layers
  SET est_minutes = 10,
      purpose = 'Estimates evolving psychological tendencies through realistic decisions, learning behaviours, setbacks, trade-offs, planning, reflection and confidence calibration.'
  WHERE id = v_layer;

  content := $json$
  [
    {
      "slug":"l1_unfamiliar_project","dim":"self_efficacy","type":"single_choice","order":1,"required":true,
      "prompt":"A teacher offers you a project in a subject you have never studied. You have two weeks and guidance may be limited.",
      "description":"Which response is closest to what you would actually do?",
      "options":[
        {"value":"start_and_learn","label":"Say yes, start with what I know, and learn the gaps as I go","signals":[["self_efficacy",0.9,1],["curiosity",0.75,0.6],["uncertainty_tolerance",0.8,0.6]]},
        {"value":"start_with_support","label":"Say yes, but first find a person, example or structure to guide me","signals":[["self_efficacy",0.68,1],["help_seeking",0.8,0.7],["reflection",0.62,0.4]]},
        {"value":"negotiate_scope","label":"Ask to narrow the project until it includes something familiar","signals":[["self_efficacy",0.48,1],["uncertainty_tolerance",0.45,0.6]]},
        {"value":"decline","label":"Pass on it because the risk of getting it wrong feels too high","signals":[["self_efficacy",0.2,1],["uncertainty_tolerance",0.2,0.6]]}
      ]
    },
    {
      "slug":"l1_stuck_two_hours","dim":"persistence","type":"single_choice","order":2,"required":true,
      "prompt":"You have been stuck on the same problem for two hours. Nothing is working.",
      "description":"What do you usually do next?",
      "options":[
        {"value":"keep_trying","label":"Try several different approaches until something moves","signals":[["persistence",0.88,1],["adaptability",0.62,0.5]]},
        {"value":"step_back","label":"Pause, diagnose why my approach is failing, then restart","signals":[["persistence",0.76,1],["reflection",0.9,0.9],["adaptability",0.7,0.6]]},
        {"value":"ask_help","label":"Look for an explanation, example or person who can unblock me","signals":[["persistence",0.64,1],["help_seeking",0.86,0.8],["adaptability",0.68,0.5]]},
        {"value":"switch_task","label":"Move to something else and often do not return to it","signals":[["persistence",0.22,1],["reflection",0.28,0.5]]}
      ]
    },
    {
      "slug":"l1_persistence_probe","dim":"persistence","type":"single_choice","order":3,"required":false,
      "prompt":"When you leave something unfinished, what is usually happening underneath?",
      "description":"There is no wrong answer. This helps us interpret your last answer fairly.",
      "config":{"showIf":{"questionSlug":"l1_stuck_two_hours","op":"in","value":["switch_task"]}},
      "options":[
        {"value":"interest_fades","label":"The interesting part ends when the hard part begins","signals":[["persistence",0.22,1],["intrinsic_motivation",0.32,0.6]]},
        {"value":"life_intervenes","label":"Other responsibilities genuinely take over","signals":[["persistence",0.52,1]]},
        {"value":"self_doubt","label":"I begin to doubt that I can finish it well","signals":[["persistence",0.32,1],["self_efficacy",0.24,0.8]]},
        {"value":"return_later","label":"I pause and usually come back with a fresh approach","signals":[["persistence",0.66,1],["reflection",0.68,0.6],["adaptability",0.62,0.5]]}
      ]
    },
    {
      "slug":"l1_recent_exploration","dim":"curiosity","type":"multiple_choice","order":4,"required":true,
      "prompt":"In the last two weeks, which of these have you actually done?",
      "description":"Choose what genuinely happened, not what sounds impressive.",
      "config":{"min":0,"max":6},
      "options":[
        {"value":"followed_a_question","label":"Followed a question far beyond what class required","signals":[["curiosity",0.9,1],["intrinsic_motivation",0.72,0.6]]},
        {"value":"built_or_tested","label":"Built, made, tested or tried something independently","signals":[["curiosity",0.82,0.8],["self_efficacy",0.7,0.6],["achievement_orientation",0.66,0.5]]},
        {"value":"asked_how","label":"Asked someone to explain how something really works","signals":[["curiosity",0.78,0.8],["reflection",0.56,0.4]]},
        {"value":"explored_a_path","label":"Looked into a course, career or skill I had not considered","signals":[["curiosity",0.8,0.8],["future_orientation",0.62,0.5]]},
        {"value":"studied_for_marks","label":"Studied mainly for a mark, exam or external requirement","signals":[["intrinsic_motivation",0.34,0.6],["achievement_orientation",0.5,0.4]]},
        {"value":"none","label":"Honestly, none of these","signals":[["curiosity",0.22,0.8]]}
      ]
    },
    {
      "slug":"l1_curiosity_dead_end","dim":"curiosity","type":"single_choice","order":5,"required":true,
      "prompt":"You find an unfamiliar topic that looks interesting, but the first explanation you find is confusing.",
      "description":"What are you most likely to do?",
      "options":[
        {"value":"try_another_angle","label":"Find another explanation, example or way into it","signals":[["curiosity",0.88,1],["persistence",0.7,0.6],["adaptability",0.72,0.6]]},
        {"value":"ask_someone","label":"Ask someone who understands it to point me in the right direction","signals":[["curiosity",0.74,1],["help_seeking",0.86,0.7]]},
        {"value":"save_for_later","label":"Save it for later if it becomes relevant","signals":[["curiosity",0.48,1],["future_orientation",0.55,0.4]]},
        {"value":"drop_it","label":"Leave it because the effort does not seem worth it","signals":[["curiosity",0.28,1],["persistence",0.32,0.5]]}
      ]
    },
    {
      "slug":"l1_course_tradeoff","dim":"intrinsic_motivation","type":"single_choice","order":6,"required":true,
      "prompt":"Two free courses require the same effort and time. One gives a certificate; the other teaches something you are genuinely curious about.",
      "description":"Which would you choose if you could pick only one?",
      "options":[
        {"value":"interest_first","label":"The course I am genuinely curious about","signals":[["intrinsic_motivation",0.92,1],["curiosity",0.82,0.7]]},
        {"value":"interest_with_doubt","label":"The curious course, though I would worry about missing the certificate","signals":[["intrinsic_motivation",0.7,1],["curiosity",0.68,0.6]]},
        {"value":"certificate_for_now","label":"The certificate, because visible proof matters right now","signals":[["intrinsic_motivation",0.4,1],["future_orientation",0.62,0.4]]},
        {"value":"certificate_clearly","label":"The certificate without much hesitation","signals":[["intrinsic_motivation",0.24,1]]}
      ]
    },
    {
      "slug":"l1_after_setback","dim":"reflection","type":"single_choice","order":7,"required":true,
      "prompt":"You prepared properly for a test and still scored badly.",
      "description":"What is the first useful thing you are most likely to do?",
      "options":[
        {"value":"inspect_evidence","label":"Review the paper or work to find the specific pattern behind the result","signals":[["reflection",0.92,1],["self_efficacy",0.68,0.5],["persistence",0.7,0.5]]},
        {"value":"change_method","label":"Change how I prepare and test the new method next time","signals":[["reflection",0.8,1],["adaptability",0.86,0.7]]},
        {"value":"increase_effort","label":"Decide to work harder without knowing exactly what went wrong","signals":[["reflection",0.44,1],["persistence",0.72,0.5]]},
        {"value":"avoid_it","label":"Put it out of my mind for a while","signals":[["reflection",0.22,1],["self_efficacy",0.34,0.5]]}
      ]
    },
    {
      "slug":"l1_plan_disrupted","dim":"adaptability","type":"single_choice","order":8,"required":true,
      "prompt":"Halfway through a plan you care about, you discover a better route. Switching means losing some work already done.",
      "description":"What would you most likely do?",
      "options":[
        {"value":"switch_now","label":"Switch after checking the new route is genuinely better","signals":[["adaptability",0.9,1],["reflection",0.7,0.5]]},
        {"value":"test_before_switch","label":"Run a small test first, then change course if the evidence holds","signals":[["adaptability",0.82,1],["reflection",0.9,0.7]]},
        {"value":"finish_then_change","label":"Finish this plan and use the better route next time","signals":[["adaptability",0.48,1],["persistence",0.76,0.5]]},
        {"value":"stay_with_it","label":"Stay with the original plan because changing mid-way unsettles me","signals":[["adaptability",0.22,1],["uncertainty_tolerance",0.34,0.5]]}
      ]
    },
    {
      "slug":"l1_feedback_response","dim":"reflection","type":"single_choice","order":9,"required":true,
      "prompt":"Someone whose opinion you respect points out a real flaw in your work.",
      "description":"What happens first?",
      "options":[
        {"value":"seek_details","label":"Ask for the details so I can understand and fix it","signals":[["reflection",0.9,1],["adaptability",0.84,0.7],["achievement_orientation",0.72,0.5]]},
        {"value":"defensive_then_use","label":"Feel defensive briefly, then work out what to use","signals":[["reflection",0.72,1],["adaptability",0.7,0.7]]},
        {"value":"confidence_drop","label":"Feel discouraged and need time before I can use the feedback","signals":[["reflection",0.48,1],["self_efficacy",0.34,0.7]]},
        {"value":"dismiss","label":"Decide they have misunderstood the work","signals":[["reflection",0.24,1],["adaptability",0.28,0.7]]}
      ]
    },
    {
      "slug":"l1_unclear_future","dim":"uncertainty_tolerance","type":"slider","order":10,"required":true,
      "prompt":"How okay do you feel today about not knowing exactly where your career is heading?",
      "description":"Move to the place that feels honest right now — not where you think you should be.",
      "config":{"min":0,"max":100,"step":5,"default":50,"leftLabel":"It genuinely unsettles me","rightLabel":"I can figure it out as I go","signals":[["uncertainty_tolerance",1,"linear"],["adaptability",0.4,"linear"]]},
      "options":[]
    },
    {
      "slug":"l1_uncertainty_probe","dim":"uncertainty_tolerance","type":"single_choice","order":11,"required":false,
      "prompt":"When the path ahead feels unclear, what weighs on you most?",
      "description":"This helps us understand what kind of clarity would be useful later.",
      "config":{"showIf":{"questionSlug":"l1_unclear_future","op":"lte","value":35}},
      "options":[
        {"value":"waste_years","label":"Worrying that I might spend years on the wrong thing","signals":[["uncertainty_tolerance",0.28,1],["future_orientation",0.72,0.5]]},
        {"value":"fall_behind","label":"Seeing people around me appear to have it figured out","signals":[["uncertainty_tolerance",0.26,1],["self_efficacy",0.4,0.5]]},
        {"value":"family_expectations","label":"Needing to give my family a clear answer","signals":[["uncertainty_tolerance",0.34,1]]},
        {"value":"no_first_step","label":"Not knowing what a sensible first step is","signals":[["uncertainty_tolerance",0.3,1],["self_efficacy",0.36,0.6]]}
      ]
    },
    {
      "slug":"l1_ambiguous_brief","dim":"uncertainty_tolerance","type":"single_choice","order":12,"required":true,
      "prompt":"You receive a project brief with an unclear goal and no single correct answer.",
      "description":"What is your first move?",
      "options":[
        {"value":"define_and_test","label":"Write down a working goal and test a small first step","signals":[["uncertainty_tolerance",0.86,1],["self_efficacy",0.78,0.7],["adaptability",0.7,0.5]]},
        {"value":"clarify_then_start","label":"Ask focused questions, then begin with what is clear","signals":[["uncertainty_tolerance",0.65,1],["help_seeking",0.76,0.6],["self_efficacy",0.62,0.6]]},
        {"value":"wait_for_detail","label":"Wait until someone makes the goal more specific","signals":[["uncertainty_tolerance",0.36,1]]},
        {"value":"avoid_ambiguous","label":"Try to move to a task with a clearer answer","signals":[["uncertainty_tolerance",0.2,1]]}
      ]
    },
    {
      "slug":"l1_delayed_reward","dim":"future_orientation","type":"single_choice","order":13,"required":true,
      "prompt":"You can take a small paid gig this week or join an unpaid six-month programme that builds a skill you could use for years.",
      "description":"Which option fits your situation and instinct best?",
      "options":[
        {"value":"long_term_programme","label":"Choose the programme because the long-term skill matters more","signals":[["future_orientation",0.9,1],["intrinsic_motivation",0.7,0.5]]},
        {"value":"combine_if_possible","label":"Try to combine the programme with the gig if the load is realistic","signals":[["future_orientation",0.72,1],["persistence",0.72,0.5],["achievement_orientation",0.7,0.5]]},
        {"value":"paid_gig","label":"Choose the gig because income now matters more","signals":[["future_orientation",0.38,1]]},
        {"value":"paid_gig_necessary","label":"Choose the gig because my current responsibilities leave little choice","signals":[["future_orientation",0.5,0.6]]}
      ]
    },
    {
      "slug":"l1_week_ahead","dim":"future_orientation","type":"single_choice","order":14,"required":true,
      "prompt":"You have one free evening this week and a goal that will take months to reach.",
      "description":"How do you tend to use the evening?",
      "options":[
        {"value":"small_step","label":"Take one small step that compounds toward the longer goal","signals":[["future_orientation",0.88,1],["persistence",0.72,0.6]]},
        {"value":"plan_then_start","label":"Plan the route and schedule a realistic starting point","signals":[["future_orientation",0.8,1],["reflection",0.62,0.5]]},
        {"value":"use_for_now","label":"Do something useful for an immediate need","signals":[["future_orientation",0.48,1]]},
        {"value":"rest_or_react","label":"Use it for whatever feels most urgent or appealing that day","signals":[["future_orientation",0.3,1]]}
      ]
    },
    {
      "slug":"l1_hard_vs_easy","dim":"achievement_orientation","type":"single_choice","order":15,"required":true,
      "prompt":"Two electives are available. One is difficult and may produce a middling grade; the other is easier and likely to produce a top grade.",
      "description":"Which do you choose?",
      "options":[
        {"value":"challenge","label":"The difficult one because I want to become better at the work","signals":[["achievement_orientation",0.9,1],["self_efficacy",0.72,0.5],["uncertainty_tolerance",0.66,0.4]]},
        {"value":"challenge_with_support","label":"The difficult one if I can get enough support to learn well","signals":[["achievement_orientation",0.7,1],["self_efficacy",0.52,0.5]]},
        {"value":"easy_grade_context","label":"The easier one because grades carry real weight for me right now","signals":[["achievement_orientation",0.42,1],["future_orientation",0.56,0.3]]},
        {"value":"easy_grade","label":"The easier one because a top grade is the better outcome","signals":[["achievement_orientation",0.25,1]]}
      ]
    },
    {
      "slug":"l1_priorities_rank","dim":"intrinsic_motivation","type":"priority_ranking","order":16,"required":true,
      "prompt":"Put these in order of what genuinely matters most to you over the next two years.",
      "description":"Top means most important. There is no ideal order.",
      "config":{"rankSignals":{"mastery":[["intrinsic_motivation",0.9,1],["achievement_orientation",0.82,0.7]],"stability":[["future_orientation",0.72,0.7],["uncertainty_tolerance",0.36,0.5]],"recognition":[["achievement_orientation",0.62,0.5],["intrinsic_motivation",0.3,0.6]],"freedom":[["uncertainty_tolerance",0.76,0.6],["curiosity",0.72,0.6]],"impact":[["intrinsic_motivation",0.72,0.6],["future_orientation",0.66,0.5]]}},
      "options":[
        {"value":"mastery","label":"Getting genuinely good at something"},
        {"value":"stability","label":"A secure, predictable path"},
        {"value":"recognition","label":"Being recognised for my work"},
        {"value":"freedom","label":"Freedom to choose what I work on"},
        {"value":"impact","label":"Work that visibly helps people"}
      ]
    },
    {
      "slug":"l1_first_step","dim":"self_efficacy","type":"single_choice","order":17,"required":true,
      "prompt":"You decide to learn a completely new skill next month. No one is telling you how to begin.",
      "description":"What usually happens first?",
      "options":[
        {"value":"experiment","label":"Start experimenting and correct course as I learn","signals":[["self_efficacy",0.86,1],["curiosity",0.8,0.6],["uncertainty_tolerance",0.76,0.5]]},
        {"value":"find_structure","label":"Find a clear course, syllabus or structure first","signals":[["self_efficacy",0.68,1],["future_orientation",0.7,0.4],["reflection",0.62,0.4]]},
        {"value":"find_person","label":"Find someone doing it and learn by following their path","signals":[["self_efficacy",0.54,1],["help_seeking",0.78,0.6],["adaptability",0.6,0.4]]},
        {"value":"stall","label":"Plan it for a while and often do not begin","signals":[["self_efficacy",0.26,1],["persistence",0.34,0.6]]}
      ]
    },
    {
      "slug":"l1_help_seeking","dim":"self_efficacy","type":"single_choice","order":18,"required":true,
      "prompt":"You have tried twice and still cannot make progress on a task that matters.",
      "description":"What would you most likely do next?",
      "options":[
        {"value":"specific_help","label":"Ask a specific question and use the answer to try again","signals":[["self_efficacy",0.82,1],["help_seeking",0.92,0.8],["persistence",0.78,0.6]]},
        {"value":"show_attempt","label":"Show someone my attempts and ask them to spot the gap","signals":[["self_efficacy",0.7,1],["help_seeking",0.86,0.8],["reflection",0.72,0.6]]},
        {"value":"more_solo","label":"Keep working alone for longer before asking","signals":[["self_efficacy",0.62,1],["persistence",0.76,0.6]]},
        {"value":"stop","label":"Put it aside because needing help feels like a sign I cannot do it","signals":[["self_efficacy",0.25,1],["persistence",0.25,0.6],["help_seeking",0.18,0.7]]}
      ]
    },
    {
      "slug":"l1_confidence_selfreport","dim":"confidence_calibration","type":"slider","order":19,"required":true,
      "prompt":"How confident are you that you could learn a demanding new skill from scratch this year?",
      "description":"Give your honest prediction, not the answer you wish were true.",
      "config":{"min":0,"max":100,"step":5,"default":50,"leftLabel":"Not confident","rightLabel":"Very confident","signals":[["self_reported_confidence",1,"linear"]]},
      "options":[]
    },
    {
      "slug":"l1_track_record","dim":"confidence_calibration","type":"single_choice","order":20,"required":true,
      "prompt":"Think about the last three things you started entirely on your own. How many reached a finish you accepted?",
      "description":"Count real examples, not intentions.",
      "options":[
        {"value":"three","label":"All three","signals":[["behavioural_followthrough",0.92,1],["persistence",0.86,0.8]]},
        {"value":"two","label":"Two of them","signals":[["behavioural_followthrough",0.7,1],["persistence",0.7,0.8]]},
        {"value":"one","label":"One of them","signals":[["behavioural_followthrough",0.42,1],["persistence",0.44,0.8]]},
        {"value":"none","label":"None so far","signals":[["behavioural_followthrough",0.18,1],["persistence",0.24,0.8]]}
      ]
    },
    {
      "slug":"l1_review_week","dim":"reflection","type":"single_choice","order":21,"required":true,
      "prompt":"At the end of a demanding week, what do you naturally look back on?",
      "description":"Choose the closest match, even if you do not do it every week.",
      "options":[
        {"value":"patterns","label":"What worked, what failed and what pattern I should change","signals":[["reflection",0.92,1],["adaptability",0.76,0.6]]},
        {"value":"progress","label":"What I completed and what I can build on next","signals":[["reflection",0.76,1],["future_orientation",0.65,0.5]]},
        {"value":"feelings","label":"How the week made me feel, without analysing it much","signals":[["reflection",0.5,1]]},
        {"value":"move_on","label":"Very little — I prefer to move on to the next week","signals":[["reflection",0.25,1]]}
      ]
    },
    {
      "slug":"l1_reflection_note","dim":"reflection","type":"reflection","order":22,"required":false,
      "prompt":"What would you want a mentor to understand about where you are right now?",
      "description":"Optional. A sentence or two is enough; you can skip this.",
      "config":{"maxLength":500,"rows":4},
      "options":[]
    }
  ]$json$::jsonb;

  FOR q IN SELECT * FROM jsonb_array_elements(content) LOOP
    SELECT id INTO v_type
    FROM public.ae_question_types
    WHERE slug = q->>'type';
    IF v_type IS NULL THEN
      RAISE EXCEPTION 'unknown question type %', q->>'type';
    END IF;

    SELECT id INTO v_dim
    FROM public.ae_dimensions
    WHERE layer_id = v_layer
      AND slug = q->>'dim';
    IF v_dim IS NULL THEN
      RAISE EXCEPTION 'unknown Layer 1 dimension %', q->>'dim';
    END IF;

    INSERT INTO public.ae_questions
      (version_id, layer_id, dimension_id, order_index, slug, type_id, prompt, description, helper, required, config, a11y)
    VALUES
      (v_version, v_layer, v_dim, (q->>'order')::int, q->>'slug', v_type,
       jsonb_build_object('en', q->>'prompt'),
       CASE WHEN q ? 'description' THEN jsonb_build_object('en', q->>'description') ELSE NULL END,
       NULL,
       COALESCE((q->>'required')::boolean, true),
       COALESCE(q->'config', '{}'::jsonb),
       '{}'::jsonb)
    ON CONFLICT (version_id, slug) DO UPDATE SET
      layer_id = EXCLUDED.layer_id,
      dimension_id = EXCLUDED.dimension_id,
      order_index = EXCLUDED.order_index,
      type_id = EXCLUDED.type_id,
      prompt = EXCLUDED.prompt,
      description = EXCLUDED.description,
      helper = EXCLUDED.helper,
      required = EXCLUDED.required,
      config = EXCLUDED.config,
      a11y = EXCLUDED.a11y
    RETURNING id INTO v_q;

    DELETE FROM public.ae_question_options WHERE question_id = v_q;

    i := 0;
    FOR o IN SELECT * FROM jsonb_array_elements(COALESCE(q->'options', '[]'::jsonb)) LOOP
      i := i + 1;
      INSERT INTO public.ae_question_options
        (question_id, order_index, label, value, meta)
      VALUES
        (v_q, i, jsonb_build_object('en', o->>'label'), o->>'value',
         CASE WHEN o ? 'signals' THEN jsonb_build_object('signals', o->'signals') ELSE '{}'::jsonb END);
    END LOOP;
  END LOOP;
END
$migration$;