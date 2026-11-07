import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    const conn = await connectDB();
    return NextResponse.json({ data: { db: "connected", name: conn.connection.name }, error: null });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json({ data: null, error: "Database connection failed" }, { status: 500 });
  }
}
