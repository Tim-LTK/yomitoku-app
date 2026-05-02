import { z } from "zod";

export const extractResponseSchema = z.object({
  text: z.string(),
});

export type ExtractResponsePayload = z.infer<typeof extractResponseSchema>;

export function safeParseExtractResponse(data: unknown) {
  return extractResponseSchema.safeParse(data);
}
