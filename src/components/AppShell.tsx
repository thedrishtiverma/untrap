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
    <div className="min-h-screen untrap-ivory">
      <header className="sticky top-0 z-20 border-b border-foreground/8 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link to="/dashboard"><Logo size="md" /></Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="text-xs font-semibold text-foreground/50 hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-32 pt-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/8 bg-background/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold tracking-wide transition",
                    active ? "text-foreground" : "text-foreground/45 hover:text-foreground",
                  )}
                >
                  <span className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl transition",
                    active ? "bg-foreground text-background" : "bg-transparent",
                  )}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
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
