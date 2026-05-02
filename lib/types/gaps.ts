import { z } from "zod";

import { breakdownElementSchema } from "@/lib/types/breakdown";

/** Tutor copy for a single tapped element — aligned with FastAPI `ElementExplanation`. */

export const elementExplanationSchema = z.object({
  headline: z.string().min(1),
  detail: z.string().min(1),
  commonPitfalls: z.string().nullable().optional(),
});

export type ElementExplanation = z.infer<typeof elementExplanationSchema>;

export const explainApiResponseSchema = z.object({
  explanation: elementExplanationSchema,
});

export type ExplainApiPayload = z.infer<typeof explainApiResponseSchema>;

export function safeParseExplainResponse(
  data: unknown,
): z.SafeParseReturnType<unknown, ExplainApiPayload> {
  return explainApiResponseSchema.safeParse(data);
}

/** Learner-flagged weak spot saved locally (Phase 1.5). */

export const knowledgeGapSchema = z.object({
  id: z.string().min(8),
  createdAtIso: z.string().min(1),
  breakdownRouteId: z.string().min(1),
  sentenceIndex: z.number().int().nonnegative(),
  sourceSentence: z.string().min(1),
  element: breakdownElementSchema,
  explanationSnapshot: elementExplanationSchema,
});

export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;

export const knowledgeGapsArraySchema = z.array(knowledgeGapSchema);
