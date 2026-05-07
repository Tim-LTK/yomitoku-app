import { z } from "zod";

import {
  type BreakdownElement,
  type GrammarRole,
  breakdownElementSchema,
  jlptBandSchema,
} from "@/lib/types/breakdown";

export const flaggedItemTypeSchema = z.enum(["grammar", "vocabulary", "expression"]);

export const highlightTierSchema = z.enum(["consolidate", "stretch"]);

export const flaggedItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  reading: z.string(),
  type: flaggedItemTypeSchema,
  jlptLevel: jlptBandSchema,
  briefExplanation: z.string(),
  inContext: z.string(),
  highlightTier: highlightTierSchema,
  /** JMdict-derived pitch pattern — display-only, optional. */
  pitchAccent: z.string().nullable().optional(),
});

export type FlaggedItem = z.infer<typeof flaggedItemSchema>;

export const scanResultSchema = z.object({
  passage: z.string().min(1),
  flaggedItems: z.array(flaggedItemSchema),
  overallDifficulty: jlptBandSchema,
  userLevel: z.string(),
});

export type ScanResult = z.infer<typeof scanResultSchema>;

export function safeParseScanResult(
  payload: unknown,
): z.SafeParseReturnType<unknown, ScanResult> {
  return scanResultSchema.safeParse(payload);
}

export const askResponseSchema = z.object({
  answer: z.string(),
  suggestedFlaggedItem: flaggedItemSchema.optional(),
});

export type AskResponse = z.infer<typeof askResponseSchema>;

export function safeParseAskResponse(
  payload: unknown,
): z.SafeParseReturnType<unknown, AskResponse> {
  return askResponseSchema.safeParse(payload);
}

/** Map a scan highlight to API `BreakdownElement` for `POST /explain`. */
export function breakdownElementFromFlaggedItem(item: FlaggedItem): BreakdownElement {
  const role: GrammarRole = item.type === "vocabulary" ? "noun" : "grammar_pattern";
  const draft: BreakdownElement = {
    text: item.text,
    reading: item.reading,
    role,
    meaning: item.briefExplanation,
    note: item.inContext.trim().length > 0 ? item.inContext : null,
  };
  return breakdownElementSchema.parse(draft);
}
