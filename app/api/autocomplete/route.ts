import { NextResponse, type NextRequest } from "next/server";
import { autocomplete } from "@/server/services/search.service";
import { autocompleteParams } from "@/server/validators/search";

export async function GET(req: NextRequest) {
  const parsed = autocompleteParams.safeParse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ data: [], error: "Invalid query" }, { status: 400 });

  try {
    const data = await autocomplete(parsed.data.q);
    return NextResponse.json(
      { data, error: null },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
    );
  } catch (err) {
    console.error("[autocomplete]", err);
    return NextResponse.json({ data: [], error: "Search failed" }, { status: 500 });
  }
}
