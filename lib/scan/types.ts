// Shared by server (scan.service) and client (ScanFlow). No server imports here.
import type { MedicineHit } from "@/lib/search/types";

export type ScanItem = {
  written: string; // what the prescription says, e.g. "Tab. Napa 500mg"
  confidence: "high" | "low"; // model's own reading confidence
  candidates: MedicineHit[]; // best DB matches, best first
  selected: string | null; // slug of the suggested match; null = no good match
  sure: boolean; // our match is strong (brand + strength agree)
};

export type ScanResult = { isPrescription: boolean; items: ScanItem[] };
