import { z } from "zod";

/** Tags Claude may attach when an answer misses the mark — keep aligned with FastAPI `PracticeErrorTag`. */

export const practiceErrorTagSchema = z.enum([
  "particle",
  "conjugation",
  "vocabulary",
  "grammar_pattern",
  "register",
  "orthography",
  "listening",
  "other",
]);

export type PracticeErrorTag = z.infer<typeof practiceErrorTagSchema>;

/** Single generated practice unit (question stem + metadata). IDs are stable across generate → evaluate round-trips. */

export const practiceItemSchema = z.object({
  itemId: z.string().min(1),
  practiceType: z.string().min(1),
  prompt: z.string().min(1),
  hint: z.string().nullable().optional(),
});

export type PracticeItem = z.infer<typeof practiceItemSchema>;

/** Model-evaluated learner response — quality 0–5 plus structured error tags per cursorrules Phase 2. */

export const practiceResultSchema = z.object({
  qualityScore: z.number().int().min(0).max(5),
  feedback: z.string().min(1),
  errorTags: z.array(practiceErrorTagSchema),
});

export type PracticeResult = z.infer<typeof practiceResultSchema>;

export const practiceGenerateResponseSchema = z.object({
  items: z.array(practiceItemSchema).min(1),
});

export type PracticeGeneratePayload = z.infer<typeof practiceGenerateResponseSchema>;

export function safeParsePracticeGeneratePayload(
  data: unknown,
): z.SafeParseReturnType<unknown, PracticeGeneratePayload> {
  return practiceGenerateResponseSchema.safeParse(data);
}

export function safeParsePracticeResult(
  data: unknown,
): z.SafeParseReturnType<unknown, PracticeResult> {
  return practiceResultSchema.safeParse(data);
}

/** FastAPI `POST /practice/evaluate` body wrapper around `PracticeResult`. */

export const practiceEvaluateResponseSchema = z.object({
  result: practiceResultSchema,
});

export type PracticeEvaluatePayload = z.infer<typeof practiceEvaluateResponseSchema>;

export function safeParsePracticeEvaluatePayload(
  data: unknown,
): z.SafeParseReturnType<unknown, PracticeEvaluatePayload> {
  return practiceEvaluateResponseSchema.safeParse(data);
}
