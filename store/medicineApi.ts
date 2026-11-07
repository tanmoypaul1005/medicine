import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type MedicineSummary = {
  slug: string;
  brand: string;
  genericName?: string;
  strength?: string;
  form?: string;
  manufacturerName?: string;
  unitPrice?: number;
};

type ApiResponse<T> = { data: T; error: string | null };

export const medicineApi = createApi({
  reducerPath: "medicineApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Medicine"],
  keepUnusedDataFor: 300,
  endpoints: (build) => ({
    autocomplete: build.query<MedicineSummary[], string>({
      query: (q) => ({ url: "autocomplete", params: { q } }),
      transformResponse: (res: ApiResponse<MedicineSummary[]>) => res.data,
    }),
    search: build.query<MedicineSummary[], string>({
      query: (q) => ({ url: "search", params: { q } }),
      transformResponse: (res: ApiResponse<MedicineSummary[]>) => res.data,
      providesTags: ["Medicine"],
    }),
  }),
});

export const { useAutocompleteQuery, useSearchQuery } = medicineApi;
