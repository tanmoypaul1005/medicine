"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, CheckCircle2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import type { ScanResult } from "@/lib/scan/types";
import { cn, fill } from "@/lib/utils";

type T = {
  privacy: string;
  pick: string;
  pickHint: string;
  reading: string;
  reviewTitle: string;
  reviewHint: string;
  written: string;
  unsure: string;
  notThis: string;
  noMatch: string;
  showResults: string;
  retake: string;
  selectedCount: string;
  perUnit: string;
  errors: Record<"not_prescription" | "rate_limited" | "too_large" | "bad_type" | "generic", string>;
};

type Phase = { kind: "idle" } | { kind: "reading" } | { kind: "review"; result: ScanResult } | { kind: "error"; key: keyof T["errors"] };

const NONE = "__none__";
const MAX_SIDE = 1600;

/** Downscale in the browser (fast upload, less data sent): max 1600px, JPEG. Never stored anywhere. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

// No useRouter() here: this component renders outside <Suspense>, and dev "instant" validation
// can't render router hooks there. Navigation uses a plain <Link> built from the selections.
export function ScanFlow({ lang, t }: { lang: Locale; t: T }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<number, string>>({});

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setChoice({});
    setPhase({ kind: "idle" });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhase({ kind: "error", key: "bad_type" });
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPhase({ kind: "reading" });

    try {
      const body = new FormData();
      body.append("image", await compress(file), "prescription.jpg");
      const res = await fetch("/api/scan", { method: "POST", body });
      const json = (await res.json()) as { data: ScanResult | null; error: string | null };
      if (!res.ok || !json.data) {
        const key = (json.error && json.error in t.errors ? json.error : "generic") as keyof T["errors"];
        return setPhase({ kind: "error", key });
      }
      if (!json.data.isPrescription || !json.data.items.length) return setPhase({ kind: "error", key: "not_prescription" });
      setChoice(Object.fromEntries(json.data.items.map((it, i) => [i, it.selected ?? NONE])));
      setPhase({ kind: "review", result: json.data });
    } catch {
      setPhase({ kind: "error", key: "generic" });
    }
  };

  const selectedSlugs =
    phase.kind === "review" ? [...new Set(Object.values(choice).filter((s) => s && s !== NONE))] : [];

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        {t.privacy}
      </p>

      {(phase.kind === "idle" || phase.kind === "error") && (
        <div className="space-y-4">
          {phase.kind === "error" && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-300/70 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t.errors[phase.key]}
            </p>
          )}
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 text-center hover:border-brand transition">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Camera className="size-7" aria-hidden />
            </span>
            <span className="text-lg font-semibold">{t.pick}</span>
            <span className="max-w-sm text-sm text-muted">{t.pickHint}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" onChange={onFile} className="sr-only" />
          </label>
        </div>
      )}

      {phase.kind === "reading" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          {preview && <img src={preview} alt="" className="max-h-56 rounded-lg object-contain opacity-70" />}
          <Loader2 className="size-8 animate-spin text-brand" aria-hidden />
          <p className="font-medium">{t.reading}</p>
        </div>
      )}

      {phase.kind === "review" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t.reviewTitle}</h2>
            <p className="mt-1 text-sm text-muted">{t.reviewHint}</p>
          </div>

          {phase.result.items.map((it, i) => (
            <fieldset key={i} className={cn("rounded-2xl border bg-card p-4", it.sure ? "border-border" : "border-amber-300/70 dark:border-amber-500/40")}>
              <legend className="sr-only">{it.written}</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="text-muted">{t.written}</span> <span className="font-semibold">{it.written}</span>
                </p>
                {it.sure ? (
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t.unsure}</span>
                )}
              </div>

              {it.candidates.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t.noMatch}</p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {[...it.candidates.map((c) => ({ value: c.slug, c })), { value: NONE, c: null }].map(({ value, c }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                        choice[i] === value ? "border-brand bg-brand-soft/40" : "border-border hover:border-brand/50"
                      )}
                    >
                      <input type="radio" name={`item-${i}`} value={value} checked={choice[i] === value} onChange={() => setChoice((p) => ({ ...p, [i]: value }))} className="accent-(--color-brand)" />
                      {c ? (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="font-medium">{c.brand}</span>{" "}
                            <span className="text-muted">{[c.strength, c.dosageForm].filter(Boolean).join(" · ")}</span>
                            <span className="block truncate text-xs text-muted">{c.genericName}</span>
                          </span>
                          {c.unitPrice != null && (
                            <span className="shrink-0 text-right text-xs text-muted">
                              {formatPrice(lang, c.unitPrice)}
                              <span className="block">{priceBasis(c.priceLabel, t.perUnit)}</span>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">{t.notThis}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}

          <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 px-2 text-sm font-medium text-muted hover:text-foreground">
              <RotateCcw className="size-4" aria-hidden /> {t.retake}
            </button>
            <span className="text-sm text-muted">{fill(t.selectedCount, { n: formatNumber(lang, selectedSlugs.length) })}</span>
            {selectedSlugs.length ? (
              <Link
                href={href(lang, `/scan/result?m=${selectedSlugs.join(",")}`)}
                className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white dark:text-slate-900 hover:opacity-90 transition"
              >
                {t.showResults}
              </Link>
            ) : (
              <span aria-disabled className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white opacity-40 dark:text-slate-900">
                {t.showResults}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
