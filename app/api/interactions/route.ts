import { NextResponse, type NextRequest } from "next/server";
import { checkInteractions } from "@/server/services/interaction.service";
import { interactionQuery } from "@/server/validators/interaction";

// GET /api/interactions?m=slug1,slug2 → { data: CheckResult, error }
export async function GET(req: NextRequest) {
  const { m } = interactionQuery.parse({ m: req.nextUrl.searchParams.get("m") ?? "" });
  if (m.length < 2) return NextResponse.json({ data: null, error: "Select at least 2 medicines" }, { status: 400 });

  try {
    return NextResponse.json({ data: await checkInteractions(m), error: null });
  } catch (err) {
    console.error("[interactions]", err);
    return NextResponse.json({ data: null, error: "Interaction check failed" }, { status: 500 });
  }
}
