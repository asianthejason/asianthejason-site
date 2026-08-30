import { supabase, AuthUser } from "./supabase";

export type SignupData = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginData = {
  email: string;
  password: string;
};

/**
 * Sign up a new user with email, password, and display name
 */
export async function signup(data: SignupData) {
  const { email, password, displayName } = data;

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error("User creation failed");
  }

  // Supabase sends confirmation during sign-up. If confirmation is disabled,
  // explicitly end the session to preserve the existing verify-first flow.
  if (authData.session) await supabase.auth.signOut();

  return { user: authData.user };
}

/**
 * Log in an existing user
 */
export async function login(data: LoginData) {
  const { email, password } = data;

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error("Login failed");
  }

  if (!authData.user.email_confirmed_at) {
    // Try to send verification email
    try {
      await supabase.auth.resend({ type: "signup", email });
    } catch (err) {
      console.error("Error sending verification email:", err);
    }
    throw new Error(
      "Please verify your email before logging in. Check your inbox for the verification link."
    );
  }

  return { user: authData.user };
}

/** Start Google OAuth. Supabase redirects back to the current page. */
export async function signInWithGoogle() {
  const redirectTo =
    typeof window === "undefined" ? undefined : window.location.href;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Get current auth user
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Convert Supabase user to AuthUser
 */
export function toAuthUser(supabaseUser: any): AuthUser {
  return {
    uid: supabaseUser.id,
    email: supabaseUser.email || null,
    displayName: supabaseUser.user_metadata?.display_name || null,
    hasPasswordIdentity:
      supabaseUser.identities?.some(
        (identity: { provider?: string }) => identity.provider === "email"
      ) ?? false,
  };
}
