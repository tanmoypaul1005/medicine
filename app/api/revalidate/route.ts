import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

// POST /api/revalidate  { tags: ["conditions"] }  header x-revalidate-secret: $REVALIDATE_SECRET
// Called by data scripts (scripts/lib/revalidate.ts) after DB writes so "use cache" data refreshes.
const body = z.object({ tags: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/)).min(1).max(50) });

function authorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ data: null, error: "Invalid body" }, { status: 400 });

  for (const tag of parsed.data.tags) revalidateTag(tag, "max");
  return NextResponse.json({ data: { revalidated: parsed.data.tags }, error: null });
}
