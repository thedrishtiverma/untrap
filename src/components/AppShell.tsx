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
    <div className="min-h-screen untrap-ivory transition-colors duration-300">
      <header className="sticky top-0 z-20 border-b border-foreground/8 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 md:py-6">
          <Link to="/dashboard" aria-label="UNTRAP home" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop top-nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-foreground text-background shadow-pop"
                      : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
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

      <main className="mx-auto max-w-3xl px-5 pt-6 pb-32 md:max-w-5xl md:pb-12">{children}</main>

      {/* Mobile bottom-nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/8 bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  aria-label={label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-bold tracking-wide transition min-h-11",
                    active ? "text-foreground" : "text-foreground/45 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-2xl transition",
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
