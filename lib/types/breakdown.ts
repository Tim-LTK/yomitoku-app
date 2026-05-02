import { z } from "zod";

/** Canonical Phase 1 grammar roles — must stay aligned with FastAPI `GrammarRole`. */

export const grammarRoleSchema = z.enum([
  "topic_marker",
  "subject_marker",
  "object_marker",
  "location",
  "direction",
  "indirect_object",
  "time",
  "means_method",
  "contrast_marker",
  "verb_base",
  "verb_te_form",
  "verb_ending",
  "noun",
  "adjective_i",
  "adjective_na",
  "adverb",
  "conjunction",
  "sentence_final",
  "grammar_pattern",
  "other",
]);

export type GrammarRole = z.infer<typeof grammarRoleSchema>;

export const jlptBandSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);

export type JlptBand = z.infer<typeof jlptBandSchema>;

export const breakdownElementSchema = z.object({
  text: z.string(),
  reading: z.string(),
  role: grammarRoleSchema,
  meaning: z.string(),
  note: z.string().nullable().optional(),
});

export type BreakdownElement = z.infer<typeof breakdownElementSchema>;

export const grammarNoteSchema = z.object({
  pattern: z.string(),
  explanation: z.string(),
  timInContext: z.string(),
});

export type GrammarNote = z.infer<typeof grammarNoteSchema>;

export const sentenceBreakdownSchema = z.object({
  original: z.string(),
  elements: z.array(breakdownElementSchema),
  grammarNotes: z.array(grammarNoteSchema),
  nuanceNote: z.string(),
  difficulty: jlptBandSchema,
});

export type SentenceBreakdown = z.infer<typeof sentenceBreakdownSchema>;

export const analyseResponseSchema = z.object({
  breakdowns: z.array(sentenceBreakdownSchema),
});

export type AnalyseResponse = z.infer<typeof analyseResponseSchema>;

export function safeParseAnalyseResponse(
  payload: unknown,
): z.SafeParseReturnType<unknown, AnalyseResponse> {
  return analyseResponseSchema.safeParse(payload);
}
