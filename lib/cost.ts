/** Monthly medicine cost calculator: shared (client + server) types and math. */

export const DAYS_PER_MONTH = 30;

export type CostAlt = { slug: string; brand: string; manufacturerName: string | null; unitPrice: number };

export type CostRow = {
  slug: string;
  brand: string;
  strength: string | null;
  dosageForm: string;
  manufacturerName: string | null;
  unitPrice: number | null; // null = price unknown → excluded from totals
  priceLabel: string | null; // null = per unit (qty = per day); else pack label (qty = packs per month)
  qty: number;
  alt: CostAlt | null; // cheapest same-basis alternative that is cheaper
};

/** Units (or packs) bought per month for this row. */
export const monthlyQty = (row: Pick<CostRow, "priceLabel">, qty: number) => (row.priceLabel ? qty : qty * DAYS_PER_MONTH);

export function rowCost(row: CostRow, qty: number) {
  if (row.unitPrice == null) return null;
  const n = monthlyQty(row, qty);
  const now = row.unitPrice * n;
  const alt = row.alt ? row.alt.unitPrice * n : now;
  return { n, now, alt, yearSave: (now - alt) * 12 };
}

/** "slug:qty" list for the URL (qty omitted when 1). */
export const costParam = (items: { slug: string; qty: number }[]) =>
  items.map(({ slug, qty }) => (qty === 1 ? slug : `${slug}:${qty}`)).join(",");
