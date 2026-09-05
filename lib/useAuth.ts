import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";
import * as authService from "./auth";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  hasPasswordIdentity: boolean;
};

export type AuthMode = "login" | "signup";

export type UseAuthReturn = {
  currentUser: AuthUser | null;
  authReady: boolean;
  showAuthForm: boolean;
  setShowAuthForm: (show: boolean) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authDisplayName: string;
  setAuthDisplayName: (name: string) => void;
  authLoading: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  authStatus: string | null;
  setAuthStatus: (status: string | null) => void;
  handleAuthSubmit: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  userLabel: string;
};

/**
 * Custom hook for handling authentication state and operations
 * Replaces duplicated auth logic across all pages
 */
export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  // Set up auth state listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }

    let active = true;

    const applyUser = async (user: {
      id: string;
      email?: string;
      user_metadata?: {
        display_name?: string;
        full_name?: string;
        name?: string;
      };
      identities?: Array<{ provider?: string }>;
    }) => {
      const metadataName =
        user.user_metadata?.display_name?.trim() ||
        user.user_metadata?.full_name?.trim() ||
        user.user_metadata?.name?.trim() ||
        null;
      let profile = await authService.getUserProfile(user.id);

      // The database assigns a collision-safe name on first login. Its unique
      // index is the final authority, including for simultaneous requests.
      if (!profile) {
        const { data, error } = await supabase.rpc("ensure_user_profile");
        if (!error) profile = data;
        else console.error("Could not create Supabase user profile", error);
      }

      if (!active) return;
      setCurrentUser({
        uid: user.id,
        email: user.email || null,
        displayName: profile?.display_name || metadataName || user.email || null,
        hasPasswordIdentity:
          user.identities?.some((identity) => identity.provider === "email") ??
          false,
      });
      setAuthReady(true);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) void applyUser(data.session.user);
      else {
        setCurrentUser(null);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await applyUser(session.user);
      } else {
        setCurrentUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const userLabel =
    currentUser?.displayName || currentUser?.email || "Unknown soldier";

  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setAuthStatus(null);

      if (!isSupabaseConfigured) {
        setAuthError(
          "Authentication is not configured. Add the Supabase variables to .env.local."
        );
        return;
      }

      setAuthLoading(true);

      try {
        if (authMode === "signup") {
          if (!authDisplayName.trim()) {
            setAuthError("Please enter a display name.");
            setAuthLoading(false);
            return;
          }

          await authService.signup({
            email: authEmail.trim(),
            password: authPassword,
            displayName: authDisplayName.trim(),
          });

          setAuthStatus(
            "Account created. Check your inbox and junk mail for the verification email before logging in."
          );
          setAuthEmail("");
          setAuthPassword("");
          setAuthDisplayName("");
          // Keep form open to show status
        } else {
          await authService.login({
            email: authEmail.trim(),
            password: authPassword,
          });

          setAuthStatus("Signed in successfully!");
          setAuthEmail("");
          setAuthPassword("");
          setShowAuthForm(false);
        }
      } catch (err: any) {
        const code = err?.code || err?.message || "";
        let msg = err?.message || "Something went wrong. Please try again.";

        if (code === "auth/email-already-in-use") {
          msg = "That email is already in use. Try logging in instead.";
        } else if (code === "auth/invalid-email") {
          msg = "That email address doesn't look valid.";
        } else if (code === "auth/weak-password") {
          msg = "Password should be at least 6 characters.";
        } else if (code === "auth/invalid-login-credentials") {
          msg = "Email or password is incorrect.";
        } else if (code === "auth/user-not-found") {
          msg = "No account found with that email. Try signing up.";
        }

        setAuthError(msg);
      } finally {
        setAuthLoading(false);
      }
    },
    [authMode, authEmail, authPassword, authDisplayName]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await authService.signOut();
      setAuthStatus("Signed out.");
      setShowAuthForm(false);
    } catch (err) {
      console.error("Sign out error", err);
      setAuthError("Failed to sign out. Please try again.");
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError(null);
    setAuthStatus(null);

    if (!isSupabaseConfigured) {
      setAuthError(
        "Authentication is not configured. Add the Supabase variables to .env.local."
      );
      return;
    }

    setAuthLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in could not be started.";
      setAuthError(message);
      setAuthLoading(false);
    }
  }, []);

  return {
    currentUser,
    authReady,
    showAuthForm,
    setShowAuthForm,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authDisplayName,
    setAuthDisplayName,
    authLoading,
    authError,
    setAuthError,
    authStatus,
    setAuthStatus,
    handleAuthSubmit,
    handleGoogleSignIn,
    handleSignOut,
    userLabel,
  };
}
