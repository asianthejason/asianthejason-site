import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Keep public pages renderable in local development when auth has not been
// configured yet. Auth actions still report a useful configuration error.
export const supabase = createClient(
  supabaseUrl ?? "http://127.0.0.1:54321",
  supabaseAnonKey ?? "supabase-not-configured"
);

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  hasPasswordIdentity: boolean;
};
