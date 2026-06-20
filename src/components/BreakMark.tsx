import { cn } from "@/lib/utils";

interface BreakMarkProps {
  className?: string;
  size?: number;
  animated?: boolean;
  tone?: "accent" | "foreground" | "indigo";
}

/**
 * UNTRAP breakthrough mark — the rising arrow rising out of the wordmark's "t".
 * Standalone glyph: use for favicon, splash, hero animation, loaders.
 */
export function BreakMark({ className, size = 48, animated = false, tone = "accent" }: BreakMarkProps) {
  const fill =
    tone === "accent" ? "var(--accent)" : tone === "indigo" ? "var(--indigo)" : "var(--foreground)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn(animated && "animate-breakthrough", className)}
      aria-hidden
    >
      <path
        d="M32 10 L44 28 H37 V54 H27 V28 H20 Z"
        fill={fill}
      />
    </svg>
  );
}
