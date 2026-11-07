// Shared by the condition miner (scripts) and the runtime service.
/** Dosage forms never shown in the conditions guide (need a clinician or are not for these conditions). */
export const ALWAYS_EXCLUDED_FORMS =
  /injection|infusion|\b(iv|im|sc)\b|vial|ampoule|ophthalmic|\beye\b|\bear\b|otic|inhal|nebul|vaginal|pessary|implant|patch/i;
