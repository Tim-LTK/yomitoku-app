import { z } from "zod";

/** Mirrors FastAPI `StudentProfile` (camelCase over the wire). */

export const studentProfileSchema = z.object({
  targetLanguage: z.string().min(1),
  nativeLanguages: z.array(z.string().min(1)).min(1),
  selfReportedLevel: z.string().min(1),
  assessedLevel: z.string().min(1),
  kanjiAdvantage: z.boolean(),
  listeningGap: z.boolean(),
  weakAreas: z.array(z.string()),
  knownGrammar: z.array(z.string()),
  notes: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;

export function safeParseStudentProfile(data: unknown) {
  return studentProfileSchema.safeParse(data);
}
