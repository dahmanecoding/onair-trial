"use client";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://asbeddbtxmgulwklmunj.supabase.co";
// Publishable anon key — safe to ship in the client; all data access is enforced by RLS.
const ANON_KEY = "sb_publishable_LtPeFMWLpVH-U2SjTC-kvQ_YgH2_9hC";

export const supabase = createClient(SUPABASE_URL, ANON_KEY);
export const FN_URL = `${SUPABASE_URL}/functions/v1`;
