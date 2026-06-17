import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "dark" | "light";
}

export function Logo({ className, size = "md", showTagline = false, variant = "dark" }: LogoProps) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" } as const;
  const tone = variant === "light" ? "text-primary-foreground" : "text-primary";
  return (
    <div className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("font-display font-bold tracking-tight", sizes[size], tone)}>
        un<span className="text-accent">trap</span>
      </span>
      {showTagline && (
        <span className={cn("mt-1 text-[11px] uppercase tracking-[0.22em]", variant === "light" ? "text-primary-foreground/70" : "text-muted-foreground")}>
          Discover · Build · Become
        </span>
      )}
    </div>
  );
}
