/**
 * Layer 1 session controller: loads content + session, holds answers, and
 * autosaves every valid response with debounce and retry so a refresh, a
 * closed tab or a flaky network never loses progress.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  completeLayer1Session,
  saveLayer1Answer,
  startLayer1Session,
  trackLayer1Event,
} from "../api/layer1.functions";
import { hasValue, isLayerComplete, visibleQuestions, validateAnswerValue } from "../engine/adaptive";
import type {
  AnswerValue,
  Layer1Answer,
  Layer1Content,
  Layer1Profile,
  Layer1Question,
  SaveState,
} from "../types/layer1";

type Stage = "loading" | "welcome" | "questions" | "completing" | "done" | "error";

const DEBOUNCE_MS = 700;
const MAX_ATTEMPTS = 3;

export function useLayer1Assessment() {
  const start = useServerFn(startLayer1Session);
  const save = useServerFn(saveLayer1Answer);
  const complete = useServerFn(completeLayer1Session);
  const track = useServerFn(trackLayer1Event);

  const [stage, setStage] = useState<Stage>("loading");
  const [content, setContent] = useState<Layer1Content | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Layer1Answer[]>([]);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Layer1Profile | null>(null);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Set<string>());
  const questionShownAt = useRef<number>(Date.now());

  // ---- boot -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const device = {
          width: typeof window !== "undefined" ? window.innerWidth : 0,
          ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "",
        };
        const res = await start({ data: { device } });
        if (cancelled) return;
        setContent(res.content);
        setSessionId(res.session.sessionId);
        setAnswers(res.session.answers);
        if (res.session.status === "completed") {
          setStage("done");
        } else {
          setStage(res.session.answers.length > 0 ? "questions" : "welcome");
          if (res.session.answers.length > 0) {
            const visible = visibleQuestions(res.content.questions, res.session.answers);
            const answered = new Set(
              res.session.answers.filter((a) => !a.skipped && hasValue(a.value)).map((a) => a.questionSlug),
            );
            const next = visible.findIndex((q) => !answered.has(q.slug));
            setIndex(next === -1 ? Math.max(0, visible.length - 1) : next);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "We could not load the assessment.");
        setStage("error");
      }
    })();
    return () => {
      cancelled = true;
      timers.current.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () => (content ? visibleQuestions(content.questions, answers) : []),
    [content, answers],
  );
  const current: Layer1Question | null = visible[Math.min(index, Math.max(0, visible.length - 1))] ?? null;
  const answerFor = useCallback(
    (slug: string) => answers.find((a) => a.questionSlug === slug),
    [answers],
  );

  // ---- warn on unsaved work --------------------------------------------
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ---- persistence ------------------------------------------------------
  const persist = useCallback(
    async (question: Layer1Question, value: AnswerValue, skipped: boolean, attempt = 1): Promise<boolean> => {
      if (!sessionId) return false;
      pending.current.add(question.slug);
      setSaveState(attempt === 1 ? { kind: "saving" } : { kind: "retrying", attempt });
      try {
        await save({
          data: {
            sessionId,
            questionSlug: question.slug,
            value: skipped ? null : value,
            skipped,
            timeMs: Math.max(0, Date.now() - questionShownAt.current),
          },
        });
        pending.current.delete(question.slug);
        setSaveState({ kind: "saved", at: Date.now() });
        return true;
      } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, attempt * 900));
          return persist(question, value, skipped, attempt + 1);
        }
        pending.current.delete(question.slug);
        setSaveState({ kind: "failed" });
        setFieldError(
          err instanceof Error ? err.message : "We could not save that answer. Please try again.",
        );
        void track({ data: { event: "save_failure", questionSlug: question.slug } }).catch(() => {});
        return false;
      }
    },
    [save, sessionId, track],
  );

  const setLocalAnswer = useCallback((question: Layer1Question, value: AnswerValue, skipped = false) => {
    setAnswers((prev) => {
      const next = prev.filter((a) => a.questionSlug !== question.slug);
      next.push({ questionId: question.id, questionSlug: question.slug, value, skipped });
      return next;
    });
  }, []);

  /** Debounced change (slider, text, ranking, multi-select). */
  const onChange = useCallback(
    (question: Layer1Question, value: AnswerValue) => {
      setFieldError(null);
      setLocalAnswer(question, value);
      const existing = timers.current.get(question.slug);
      if (existing) clearTimeout(existing);
      const skipped = !hasValue(value);
      if (skipped && question.required) return;
      const check = validateAnswerValue(question, value);
      if (!check.ok) return;
      pending.current.add(question.slug);
      timers.current.set(
        question.slug,
        setTimeout(() => {
          timers.current.delete(question.slug);
          void persist(question, value, skipped);
        }, DEBOUNCE_MS),
      );
    },
    [persist, setLocalAnswer],
  );

  /** Immediate commit (discrete choice). */
  const onCommit = useCallback(
    (question: Layer1Question, value: AnswerValue) => {
      setFieldError(null);
      setLocalAnswer(question, value);
      const existing = timers.current.get(question.slug);
      if (existing) clearTimeout(existing);
      void persist(question, value, false);
    },
    [persist, setLocalAnswer],
  );

  const flush = useCallback(
    async (question: Layer1Question) => {
      const timer = timers.current.get(question.slug);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(question.slug);
        const a = answerFor(question.slug);
        if (a) await persist(question, a.value, a.skipped);
      }
    },
    [answerFor, persist],
  );

  // ---- navigation -------------------------------------------------------
  const goNext = useCallback(async () => {
    if (!current) return;
    const answer = answerFor(current.slug);
    const value = answer?.value ?? null;
    if (current.required) {
      const check = validateAnswerValue(current, value);
      if (!check.ok) {
        setFieldError(check.error);
        return;
      }
    }
    await flush(current);
    if (!current.required && !hasValue(value)) {
      setLocalAnswer(current, null, true);
      await persist(current, null, true);
    }
    setFieldError(null);
    questionShownAt.current = Date.now();
    setIndex((i) => i + 1);
  }, [answerFor, current, flush, persist, setLocalAnswer]);

  const goPrev = useCallback(() => {
    setFieldError(null);
    questionShownAt.current = Date.now();
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const beginQuestions = useCallback(() => {
    questionShownAt.current = Date.now();
    setStage("questions");
  }, []);

  const canComplete = useMemo(
    () => (content ? isLayerComplete(content.questions, answers) : false),
    [content, answers],
  );

  const submit = useCallback(async () => {
    if (!sessionId || !current) return;
    await flush(current);
    setStage("completing");
    try {
      const result = await complete({ data: { sessionId } });
      setProfile(result);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not finish the assessment.");
      setStage("questions");
      setFieldError(err instanceof Error ? err.message : null);
    }
  }, [complete, current, flush, sessionId]);

  // ---- analytics --------------------------------------------------------
  useEffect(() => {
    if (stage !== "questions" || !current) return;
    questionShownAt.current = Date.now();
    void track({
      data: {
        event: "question_viewed",
        questionSlug: current.slug,
        questionType: current.type,
        index: index + 1,
        total: visible.length,
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.slug, stage]);

  const isLastVisible = current != null && index >= visible.length - 1;

  return {
    stage,
    content,
    current,
    index,
    visibleCount: visible.length,
    answeredCount: answers.filter((a) => !a.skipped && hasValue(a.value)).length,
    answerFor,
    saveState,
    error,
    fieldError,
    profile,
    canComplete,
    isLastVisible,
    beginQuestions,
    onChange,
    onCommit,
    goNext,
    goPrev,
    submit,
  };
}
