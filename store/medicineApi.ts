import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { MedicineHit, SearchResult } from "@/lib/search/types";

export type { MedicineHit, SearchResult };

type ApiResponse<T> = { data: T; error: string | null };

export const medicineApi = createApi({
  reducerPath: "medicineApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Medicine"],
  keepUnusedDataFor: 300,
  endpoints: (build) => ({
    autocomplete: build.query<MedicineHit[], string>({
      // Normalized like the server cache key → "Napa" / "napa " hit the same CDN entry.
      query: (q) => ({ url: "autocomplete", params: { q: q.replace(/\s+/g, " ").trim().toLowerCase() } }),
      transformResponse: (res: ApiResponse<MedicineHit[]>) => res.data,
    }),
    search: build.query<SearchResult, { q: string; page?: number }>({
      query: ({ q, page = 1 }) => ({ url: "search", params: { q, page } }),
      transformResponse: (res: ApiResponse<SearchResult>) => res.data,
      providesTags: ["Medicine"],
    }),
  }),
});

export const { useAutocompleteQuery, useSearchQuery } = medicineApi;
