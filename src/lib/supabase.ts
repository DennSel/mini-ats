import { createClient } from "@supabase/supabase-js";

// Public values for the external Supabase project (feucmmhvmbznbjvqrrut).
// Avoid reading VITE_SUPABASE_* directly because Lovable Cloud injects its own internal project there.
export const supabaseUrl =
  (import.meta.env["VITE_SB_URL"] as string | undefined) ||
  "https://feucmmhvmbznbjvqrrut.supabase.co";
const supabaseKey =
  (import.meta.env["VITE_SB_PUBLISHABLE_KEY"] as string | undefined) ||
  "sb_publishable_Bjsl3vmMdYUnn21-IOa_tQ_GxyN_T0j";

export const supabase = createClient(supabaseUrl, supabaseKey);
