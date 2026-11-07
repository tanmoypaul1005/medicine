import { NextResponse, type NextRequest } from "next/server";
import { searchMedicines } from "@/server/services/search.service";
import { searchParamsSchema } from "@/server/validators/search";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = searchParamsSchema.safeParse({ q: sp.get("q") ?? "", page: sp.get("page") ?? undefined });
  if (!parsed.success) return NextResponse.json({ data: null, error: "Invalid query" }, { status: 400 });

  try {
    const data = await searchMedicines(parsed.data.q, parsed.data.page);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ data: null, error: "Search failed" }, { status: 500 });
  }
}
