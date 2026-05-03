import type { GrammarRole } from "@/lib/types/breakdown";

/**
 * Tailwind NativeWind classes for grammar-role chips.
 * Categories: particles (blue/sky), verbs (indigo), grammar_pattern (amber),
 * nouns (neutral), time/location/direction (teal), adjectives/adverbs (green),
 * other/conjunction/S-final (slate).
 */
export type RoleColours = Readonly<{ chipBg: string; chipText: string }>;

const ROLE_COLOURS: Record<GrammarRole, RoleColours> = {
  topic_marker: { chipBg: "bg-sky-200", chipText: "text-sky-950" },
  subject_marker: { chipBg: "bg-sky-200", chipText: "text-sky-950" },
  object_marker: { chipBg: "bg-sky-200", chipText: "text-sky-950" },
  contrast_marker: { chipBg: "bg-sky-200", chipText: "text-sky-950" },

  verb_base: { chipBg: "bg-indigo-200", chipText: "text-indigo-950" },
  verb_te_form: { chipBg: "bg-indigo-200", chipText: "text-indigo-950" },
  verb_ending: { chipBg: "bg-indigo-200", chipText: "text-indigo-950" },

  grammar_pattern: { chipBg: "bg-amber-200", chipText: "text-amber-950" },

  noun: { chipBg: "bg-neutral-300", chipText: "text-neutral-900" },

  time: { chipBg: "bg-teal-200", chipText: "text-teal-950" },
  location: { chipBg: "bg-teal-200", chipText: "text-teal-950" },
  direction: { chipBg: "bg-teal-200", chipText: "text-teal-950" },
  indirect_object: { chipBg: "bg-teal-200", chipText: "text-teal-950" },
  means_method: { chipBg: "bg-teal-200", chipText: "text-teal-950" },

  adjective_i: { chipBg: "bg-emerald-200", chipText: "text-emerald-950" },
  adjective_na: { chipBg: "bg-emerald-200", chipText: "text-emerald-950" },
  adverb: { chipBg: "bg-emerald-200", chipText: "text-emerald-950" },

  conjunction: { chipBg: "bg-slate-200", chipText: "text-slate-900" },
  sentence_final: { chipBg: "bg-slate-200", chipText: "text-slate-900" },
  other: { chipBg: "bg-slate-200", chipText: "text-slate-900" },
};

export function getRoleColour(role: GrammarRole): RoleColours {
  return ROLE_COLOURS[role];
}
