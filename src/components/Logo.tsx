import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  variant?: "dark" | "light";
}

/**
 * UNTRAP wordmark with an upward-breaking element rising from the "t".
 * The arrow is the brand metaphor: a student breaks up out of confusion.
 */
export function Logo({ className, size = "md", showTagline = false, variant = "dark" }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl sm:text-7xl",
  } as const;
  const tone = variant === "light" ? "text-primary-foreground" : "text-foreground";
  const accentTone = variant === "light" ? "text-accent" : "text-accent";
  const tagTone = variant === "light" ? "text-primary-foreground/60" : "text-muted-foreground";

  return (
    <div className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("relative inline-flex items-baseline font-display font-extrabold tracking-tight", sizes[size], tone)}>
        un
        <span className="relative">
          <span aria-hidden className={cn("pointer-events-none absolute -top-[0.55em] left-1/2 -translate-x-1/2", accentTone)}>
            <BreakArrow />
          </span>
          t
        </span>
        rap
        <span className={cn("ml-0.5", accentTone)}>.</span>
      </span>
      {showTagline && (
        <span className={cn("mt-2 text-[10px] font-semibold uppercase tracking-[0.3em]", tagTone)}>
          Discover · Build · Become
        </span>
      )}
    </div>
  );
}

function BreakArrow() {
  return (
    <svg
      width="0.7em"
      height="0.7em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
    >
      <path
        d="M12 2 L12 14"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M5 9 L12 2 L19 9"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
