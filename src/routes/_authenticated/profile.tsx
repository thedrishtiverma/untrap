import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · UNTRAP" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <header className="animate-break-up">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Your account</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Profile</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Manage your UNTRAP account. Edit your details to keep Saarthi&apos;s guidance personal to you.
        </p>
      </header>

      {loading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-foreground/40" /></div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground">
                <User className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{profile?.name || "Friend"}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Age" value={profile?.age} />
              <Row label="Education" value={profile?.education_level} />
              <Row label="City" value={profile?.city} />
              <Row label="Language" value={profile?.language} />
            </dl>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-bold">Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign out of UNTRAP on this device. Your progress stays safe.
            </p>
            <button
              onClick={signOut}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-foreground/5"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
