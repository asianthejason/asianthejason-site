import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  hasPasswordIdentity: boolean;
};
