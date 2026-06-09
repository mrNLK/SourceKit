import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SourceKitMark } from "@/components/brand/SourceKitMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postAuthRedirectStorageKey, sanitizeRedirectPath } from "@/lib/auth-redirect";

type AuthMode = "sign-in" | "sign-up";
type AuthAction = "google" | "email-sign-in" | "email-sign-up" | null;

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loadingAction, setLoadingAction] = useState<AuthAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isLoading: boolean = loadingAction !== null;
  const isEmailSignInLoading: boolean = loadingAction === "email-sign-in";
  const isEmailSignUpLoading: boolean = loadingAction === "email-sign-up";
  const isGoogleLoading: boolean = loadingAction === "google";
  const redirectPath = sanitizeRedirectPath(searchParams.get("redirect"), "/");

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoadingAction("google");
    setError(null);
    setMessage(null);
    if (redirectPath !== "/") {
      window.localStorage.setItem(postAuthRedirectStorageKey, redirectPath);
    } else {
      window.localStorage.removeItem(postAuthRedirectStorageKey);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message || "Sign-in failed");
    }
    setLoadingAction(null);
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail: string = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }
    if (redirectPath !== "/") {
      window.localStorage.setItem(postAuthRedirectStorageKey, redirectPath);
    } else {
      window.localStorage.removeItem(postAuthRedirectStorageKey);
    }

    if (mode === "sign-in") {
      setLoadingAction("email-sign-in");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        setError(signInError.message || "Email/password sign-in failed");
      }
      setLoadingAction(null);
      return;
    }

    setLoadingAction("email-sign-up");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (signUpError) {
      setError(signUpError.message || "Account creation failed");
      setLoadingAction(null);
      return;
    }
    if (data.session) {
      setMessage("Account created. You are signed in.");
    } else {
      setMessage("Account created. Check your email to confirm, then sign in.");
    }
    setLoadingAction(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <SourceKitMark className="w-12 h-12 text-foreground" />
          <div className="text-lg tracking-tight">
            <span className="text-primary font-semibold">Source</span>
            <span className="text-foreground font-medium">Kit</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to start sourcing</p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{error}</p>
        )}

        {message && (
          <p className="text-sm text-primary bg-primary/10 rounded-lg px-4 py-2">{message}</p>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
          <Button
            type="button"
            variant={mode === "sign-in" ? "default" : "ghost"}
            disabled={isLoading}
            onClick={() => {
              setMode("sign-in");
              setError(null);
              setMessage(null);
            }}
            className="w-full"
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "sign-up" ? "default" : "ghost"}
            disabled={isLoading}
            onClick={() => {
              setMode("sign-up");
              setError(null);
              setMessage(null);
            }}
            className="w-full"
          >
            Create account
          </Button>
        </div>

        <form className="space-y-4 text-left" onSubmit={handleEmailAuth}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {mode === "sign-in"
              ? (isEmailSignInLoading ? "Signing in..." : "Sign in with email")
              : (isEmailSignUpLoading ? "Creating account..." : "Create account")}
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
            Or
          </span>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full gap-2"
          variant="outline"
          size="lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isGoogleLoading ? "Signing in..." : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
};

export default Auth;
