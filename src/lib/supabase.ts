import { createClient } from "@supabase/supabase-js";

// Public values (safe to commit); env vars override them.
export const supabaseUrl =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
  "https://feucmmhvmbznbjvqrrut.supabase.co";
const supabaseKey =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
  "sb_publishable_Bjsl3vmMdYUnn21-IOa_tQ_GxyN_T0j";

export const supabase = createClient(supabaseUrl, supabaseKey);
