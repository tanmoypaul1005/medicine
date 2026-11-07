import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { scanPrescription } from "@/server/services/scan.service";

// POST /api/scan  multipart/form-data { image }  → { data: ScanResult, error }
// The image is processed in memory and never stored or logged.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LIMIT = 10; // scans per IP per hour

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return NextResponse.json({ data: null, error: "no_image" }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ data: null, error: "bad_type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ data: null, error: "too_large" }, { status: 413 });

  // Count only requests that would reach Gemini (the paid call)
  const rl = rateLimit(`scan:${clientIp(req.headers)}`, LIMIT, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { data: null, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const data = await scanPrescription(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("[scan] failed:", (err as Error).message); // message only — never the image
    return NextResponse.json({ data: null, error: "scan_failed" }, { status: 502 });
  }
}
