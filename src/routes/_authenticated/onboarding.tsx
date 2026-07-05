import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Set up · UNTRAP" },
    { name: "description", content: "Set up your UNTRAP profile so Saarthi can personalize your career discovery journey." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Onboarding,
});

const educationLevels = ["Class 9-10", "Class 11-12", "Undergraduate (1st-2nd yr)", "Undergraduate (3rd-4th yr)", "Postgraduate", "Gap year"];
const languages = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali", "Other"];

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p?.onboarded) { navigate({ to: "/dashboard" }); return; }
      if (p?.name) setName(p.name);
    })();
  }, [navigate]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id, name, age: Number(age), education_level: education, city, language, onboarded: true,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("All set! Let's take the quiz.");
      navigate({ to: "/assessment" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <Logo size="md" />
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Tell us about you</h1>
        <p className="mt-2 text-sm text-muted-foreground">5 quick details. We use these to personalise your career report.</p>

        <form onSubmit={save} className="mt-8 space-y-4">
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="e.g. Aarav" />
          </Field>
          <Field label="Age">
            <input type="number" min={13} max={30} value={age} onChange={(e) => setAge(e.target.value)} required className={inputCls} placeholder="18" />
          </Field>
          <Field label="Current education">
            <select value={education} onChange={(e) => setEducation(e.target.value)} required className={inputCls}>
              <option value="">Select…</option>
              {educationLevels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} required className={inputCls} placeholder="e.g. Patna" />
          </Field>
          <Field label="Preferred language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
              {languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-brand";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
