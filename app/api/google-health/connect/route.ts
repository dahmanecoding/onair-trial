import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const target = new URL(`${supabaseUrl}/functions/v1/fitbit-oauth`);
  target.searchParams.set("action", "start");
  if (token) target.searchParams.set("token", token);

  return NextResponse.redirect(target, 302);
}
