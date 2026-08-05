import { NextResponse } from "next/server";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const syncSecret = process.env.SYNC_SECRET;
  
  if (!supabaseUrl || !syncSecret) {
    return NextResponse.json({ error: "Missing config in Vercel. Ensure NEXT_PUBLIC_SUPABASE_URL and SYNC_SECRET are set." }, { status: 500 });
  }
  
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/google-health-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-secret": syncSecret },
      body: JSON.stringify({ mode: "incremental", trigger: "manual" }),
    });
    
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Sync function failed: ${res.status} ${text}` }, { status: res.status });
    }
    
    return NextResponse.json({ status: "ok", output: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
