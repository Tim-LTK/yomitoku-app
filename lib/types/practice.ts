import { z } from "zod";

import { knowledgeGapSchema } from "@/lib/types/gaps";

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
  "unnatural_phrasing",
  "wrong_register",
]);

export type PracticeErrorTag = z.infer<typeof practiceErrorTagSchema>;

/** Alias matching Phase 2.1 wording — identical to `PracticeErrorTag`. */
export type ErrorTag = PracticeErrorTag;

export const questionTypeSchema = z.enum([
  "fill_blank",
  "conjugate",
  "translate",
  "application_mc",
  "nuance_choice",
]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

/** Single generated practice unit (question stem + metadata). IDs are stable across generate → submit round-trips. */

export const practiceItemSchema = z.object({
  itemId: z.string().min(1),
  gapId: z.string().min(1),
  questionType: questionTypeSchema,
  prompt: z.string().min(1),
  hint: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  canonicalAnswer: z.string().nullable().optional(),
});

export type PracticeItem = z.infer<typeof practiceItemSchema>;

/** Model-evaluated learner response — quality 0–5 plus structured error tags per cursorrules Phase 2. */

export const practiceResultSchema = z.object({
  qualityScore: z.number().int().min(0).max(5),
  feedback: z.string().min(1),
  errorTags: z.array(practiceErrorTagSchema),
});

export type PracticeResult = z.infer<typeof practiceResultSchema>;

export const practiceGenerateItemsArraySchema = z.array(practiceItemSchema).min(1);

export function safeParsePracticeGenerateItems(
  data: unknown,
): z.SafeParseReturnType<unknown, PracticeItem[]> {
  return practiceGenerateItemsArraySchema.safeParse(data);
}

export function safeParsePracticeResult(
  data: unknown,
): z.SafeParseReturnType<unknown, PracticeResult> {
  return practiceResultSchema.safeParse(data);
}

export const gapIntervalSchema = z.object({
  gapId: z.string().min(1),
  intervalDays: z.number().int().min(1),
  nextReviewAt: z.string().min(1),
});

export type GapInterval = z.infer<typeof gapIntervalSchema>;

export const sessionSubmissionItemSchema = z.object({
  practiceItemId: z.string().min(1),
  userAnswer: z.string(),
});

export const sessionSubmissionSchema = z.object({
  gaps: z.array(knowledgeGapSchema).min(1),
  practiceItems: z.array(practiceItemSchema).min(1),
  items: z.array(sessionSubmissionItemSchema).min(1),
  studentContext: z.string().min(1),
});

export type SessionSubmission = z.infer<typeof sessionSubmissionSchema>;

export const sessionResultSchema = z.object({
  results: z.array(practiceResultSchema),
  tutorNotes: z.string(),
  intervals: z.array(gapIntervalSchema),
});

export type SessionResult = z.infer<typeof sessionResultSchema>;

export function safeParseSessionResult(
  data: unknown,
): z.SafeParseReturnType<unknown, SessionResult> {
  return sessionResultSchema.safeParse(data);
}
