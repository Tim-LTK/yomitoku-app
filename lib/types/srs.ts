import { z } from "zod";

/** FastAPI `POST /srs/compute` body slice — aligns with Python `SrsComputeResponse`. */

export const srsComputeResponseSchema = z.object({
  suggestedIntervalDays: z.number().int().min(1).max(366),
  nextReviewAt: z.string().min(1),
  reasoning: z.string().min(1),
});

export type SrsComputeResponse = z.infer<typeof srsComputeResponseSchema>;

export function safeParseSrsComputeResponse(
  payload: unknown,
): z.SafeParseReturnType<unknown, SrsComputeResponse> {
  return srsComputeResponseSchema.safeParse(payload);
}
