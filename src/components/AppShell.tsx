import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Map, MessageCircle, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/assessment", label: "Quiz", icon: ClipboardList },
  { to: "/report", label: "Report", icon: FileText },
  { to: "/roadmap", label: "Plan", icon: Map },
  { to: "/chat", label: "Saarthi", icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/dashboard"><Logo size="sm" /></Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-28 pt-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-2xl transition",
                    active ? "bg-primary/10" : "bg-transparent")}>
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
