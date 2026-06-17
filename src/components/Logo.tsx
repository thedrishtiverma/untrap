import { cn } from "@/lib/utils";
import logoAsset from "@/assets/untrap-logo.png.asset.json";

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
  const heights = {
    sm: "h-7",
    md: "h-10",
    lg: "h-14",
    xl: "h-20 sm:h-24",
  } as const;
  const tagTone = variant === "light" ? "text-primary-foreground/60" : "text-muted-foreground";
  const invert = variant === "light" ? "invert" : "";

  return (
    <div className={cn("inline-flex flex-col items-start leading-none", className)}>
      <img
        src={logoAsset.url}
        alt="UNTRAP"
        className={cn(heights[size], "w-auto object-contain select-none", invert)}
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
