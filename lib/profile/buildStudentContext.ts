import type { StudentProfile } from "@/lib/types/profile";

/**
 * Mirrors FastAPI `build_student_context` ordering — sorted keys → `label: value` lines.
 */

export function buildStudentContext(profile: StudentProfile): string {
  const rec: Record<string, unknown> = { ...profile };
  const chunks: string[] = [];
  for (const key of Object.keys(rec).sort()) {
    const value = rec[key];
    if (typeof value === "boolean") {
      chunks.push(`${key}: ${value ? "yes" : "no"}`);
      continue;
    }
    if (Array.isArray(value)) {
      chunks.push(`${key}: ${value.join(", ")}`);
      continue;
    }
    chunks.push(`${key}: ${String(value ?? "")}`);
  }
  return chunks.join("\n").trim();
}
