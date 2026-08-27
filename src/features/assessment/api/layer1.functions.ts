import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  AssessmentError,
  completeLayer1,
  loadLayer1Content,
  loadProfile,
  logAnalytics,
  saveAnswer,
  startOrResumeSession,
} from "./layer1.server";

const answerValue = z.union([z.string(), z.array(z.string()), z.number(), z.null()]);

export const getLayer1Content = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      return await loadLayer1Content(context.supabase);
    } catch (error) {
      throw toClientError(error);
    }
  });

export const startLayer1Session = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        device: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    try {
      const content = await loadLayer1Content(context.supabase);
      const { session, resumed } = await startOrResumeSession(
        context.supabase,
        context.userId,
        content,
        data.device ?? {},
      );
      await logAnalytics(
        context.supabase,
        context.userId,
        resumed ? "assessment_resumed" : "assessment_started",
        { layer: content.layer.slug, total: content.questions.length },
      );
      return { content, session };
    } catch (error) {
      throw toClientError(error);
    }
  });

export const saveLayer1Answer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        questionSlug: z.string().min(1).max(120),
        value: answerValue,
        skipped: z.boolean().default(false),
        timeMs: z.number().int().nonnegative().max(1000 * 60 * 60).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    try {
      const result = await saveAnswer(context.supabase, context.userId, data);
      await logAnalytics(
        context.supabase,
        context.userId,
        data.skipped ? "question_skipped" : "question_answered",
        { question_slug: data.questionSlug },
      );
      return result;
    } catch (error) {
      throw toClientError(error);
    }
  });

export const completeLayer1Session = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    try {
      const profile = await completeLayer1(context.supabase, context.userId, data.sessionId);
      await logAnalytics(context.supabase, context.userId, "assessment_completed", {
        layer: profile.layerSlug,
      });
      return profile;
    } catch (error) {
      throw toClientError(error);
    }
  });

export const getLayer1Profile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      return await loadProfile(context.supabase, context.userId);
    } catch (error) {
      throw toClientError(error);
    }
  });

export const trackLayer1Event = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event: z.string().min(1).max(60),
        questionSlug: z.string().max(120).optional(),
        questionType: z.string().max(60).optional(),
        index: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional(),
        reason: z.string().max(60).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await logAnalytics(context.supabase, context.userId, data.event, {
      question_slug: data.questionSlug,
      question_type: data.questionType,
      index: data.index,
      total: data.total,
      reason: data.reason,
    });
    return { ok: true };
  });

function toClientError(error: unknown): Error {
  if (error instanceof AssessmentError) return error;
  console.error("[layer1] unexpected", error);
  return new Error("Something went wrong on our side. Please try again in a moment.");
}
