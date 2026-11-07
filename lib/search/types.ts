// Shared between server (search.service) and client (RTK Query, SearchBar). No server imports here.
export type MedicineHit = {
  slug: string;
  brand: string;
  type: "allopathic" | "herbal";
  strength?: string;
  dosageForm: string;
  genericName?: string;
  manufacturerName?: string;
  unitPrice?: number | null;
};

export type SearchResult = {
  hits: MedicineHit[];
  total: number;
  page: number;
  pages: number;
  engine: "atlas" | "regex";
};
