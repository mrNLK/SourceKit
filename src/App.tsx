import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import DeveloperProfile from "./pages/DeveloperProfile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Analytics } from "@vercel/analytics/react";
import { postAuthRedirectStorageKey, sanitizeRedirectPath } from "./lib/auth-redirect";
import { recruiterRoutes } from "./recruiter/routes";

// Recruiter OS — lazy-loaded route group
const RecruiterLayout = lazy(() => import("./recruiter/RecruiterLayout"));

const queryClient = new QueryClient();
const BdSourcingApp = lazy(() => import("./components/bd-sourcing/BdSourcingTab"));

const AppFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const AuthRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return <Navigate to={sanitizeRedirectPath(params.get("redirect"), "/")} replace />;
};

const SellKitAuthGate = ({ redirectPath }: { redirectPath: string }) => {
  useEffect(() => {
    window.localStorage.setItem(postAuthRedirectStorageKey, redirectPath);
  }, [redirectPath]);

  return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
};

const applyLightThemePreference = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("sourcekit-theme", "light");
  document.documentElement.classList.remove("dark");
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "SIGNED_IN") {
        applyLightThemePreference();
      }
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        applyLightThemePreference();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const redirectPath = sanitizeRedirectPath(
      window.localStorage.getItem(postAuthRedirectStorageKey),
      "",
    );
    if (!redirectPath) return;

    window.localStorage.removeItem(postAuthRedirectStorageKey);
    if (window.location.pathname !== redirectPath) {
      window.location.assign(redirectPath);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackLabel="app">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <Routes>
              {["/sellkit", "/bd-sourcing"].map((path) => (
                <Route
                  key={path}
                  path={path}
                  element={session ? (
                    <Suspense fallback={<AppFallback />}>
                      <BdSourcingApp userId={session.user.id} />
                    </Suspense>
                  ) : (
                    <SellKitAuthGate redirectPath={path} />
                  )}
                />
              ))}
              {session ? (
                <>
                  <Route path="/" element={<Index />} />
                  <Route path="/developer/:id" element={<DeveloperProfile />} />
                  <Route path="/recruiter/*" element={
                    <Suspense fallback={<AppFallback />}>
                      <RecruiterLayout />
                    </Suspense>
                  }>
                    {recruiterRoutes}
                  </Route>
                  <Route path="/auth" element={<AuthRedirect />} />

                  <Route path="*" element={<NotFound />} />
                </>
              ) : (
                <>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="*" element={<Navigate to="/auth" replace />} />
                </>
              )}
            </Routes>
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
