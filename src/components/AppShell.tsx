import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Map, MessageCircle, User } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/assessment", label: "Journey", icon: Compass },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/chat", label: "Saarthi", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    path === to || (to !== "/dashboard" && path.startsWith(to));

  return (
    <div className="min-h-dvh untrap-ivory transition-colors duration-300">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:py-5">
          <Link to="/dashboard" aria-label="UNTRAP home" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop top-nav */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5 rounded-full border border-border/70 bg-surface/60 p-1 backdrop-blur">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight transition-colors min-h-0",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 pt-8 pb-32 md:max-w-5xl md:pb-16">{children}</main>

      {/* Mobile bottom-nav */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-1.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold tracking-wide transition min-h-11",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      active ? "bg-foreground text-background" : "bg-transparent",
                    )}
                  >
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
