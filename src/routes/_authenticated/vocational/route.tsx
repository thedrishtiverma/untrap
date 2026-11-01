import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  VocLangProvider,
  useVocLangContext,
  VocationalTabs,
  LangToggle,
} from "@/features/vocational/ui";

export const Route = createFileRoute("/_authenticated/vocational")({
  component: VocationalLayout,
});

function VocationalLayout() {
  return (
    <VocLangProvider>
      <AppShell>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            UNTRAP Vocational
          </p>
          <LangToggleWidget />
        </div>
        <div className="mt-4">
          <VocationalTabsWidget />
        </div>
        <div className="mt-5">
          <Outlet />
        </div>
      </AppShell>
    </VocLangProvider>
  );
}

function LangToggleWidget() {
  const { lang, setLang } = useVocLangContext();
  return <LangToggle lang={lang} setLang={setLang} />;
}

function VocationalTabsWidget() {
  const { lang } = useVocLangContext();
  return <VocationalTabs lang={lang} />;
}
