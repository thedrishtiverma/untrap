import { cn } from "@/lib/utils";
import logoAsset from "@/assets/untrap-logo-nobg.png.asset.json";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  variant?: "dark" | "light";
}

/**
 * UNTRAP wordmark — uses the official lockup with the key rising from the "t".
 * The key is the brand metaphor: unlocking yourself from confusion.
 */
export function Logo({ className, size = "md", showTagline = false, variant = "dark" }: LogoProps) {
  // Sizing tuned for premium brand presence (Linear / Vercel scale).
  const widths = {
    sm: "w-[88px]",
    md: "w-[104px] sm:w-[124px]",
    lg: "w-[120px] sm:w-[140px]",
    xl: "w-[160px] sm:w-[200px]",
  } as const;
  const tagTone = variant === "light" ? "text-primary-foreground/60" : "text-muted-foreground";
  // Light variant forces white (e.g. on dark hero). Dark variant auto-inverts in dark mode.
  const tone =
    variant === "light"
      ? "invert brightness-0"
      : "transition-transform duration-200 group-hover/logo:-translate-y-0.5 dark:invert dark:brightness-0 dark:contrast-200";

  return (
    <div className={cn("group/logo inline-flex flex-col items-start leading-none", className)}>
      <img
        src={logoAsset.url}
        alt="UNTRAP"
        className={cn(widths[size], "h-auto object-contain select-none", tone)}
        draggable={false}
      />
      {showTagline && (
        <span className={cn("mt-2 text-[10px] font-semibold uppercase tracking-[0.3em]", tagTone)}>
          Discover · Build · Become
        </span>
      )}
    </div>
  );
}
