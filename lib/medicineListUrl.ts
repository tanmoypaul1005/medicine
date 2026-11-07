import { href, type Locale } from "@/lib/i18n/config";
import type { MedicineListQuery } from "@/server/validators/medicine";

/** /medicines URL keeping current filters; `over` overrides (e.g. page or view). Defaults are omitted. Client-safe. */
export function listHref(lang: Locale, query: MedicineListQuery, over: Partial<MedicineListQuery> = {}) {
  const v = { ...query, ...over };
  const p = new URLSearchParams();
  if (v.view !== "all") p.set("view", v.view);
  if (v.q) p.set("q", v.q);
  if (v.type !== "all") p.set("type", v.type);
  if (v.sort !== "brand") p.set("sort", v.sort);
  if (v.page > 1) p.set("page", String(v.page));
  const qs = p.toString();
  return href(lang, `/medicines${qs ? `?${qs}` : ""}`);
}
