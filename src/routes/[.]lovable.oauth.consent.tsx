import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthAuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthAuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthAuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthAuthorizationDetails | null; error: Error | null }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: Supabase reads its session from localStorage, which is
  // absent during SSR. Without this, signed-in users bounce to /auth.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } as never });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 untrap-ivory">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold">Could not load this authorization request</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) { setBusy(false); setError(err.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen untrap-ivory flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Connect {clientName} to UNTRAP
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This will let {clientName} read your UNTRAP career report and roadmap, and update task
          completion — acting as you. You can disconnect it anytime.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground orange-glow disabled:opacity-60"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
