const ignitedLogo = "https://i.postimg.cc/yd4Z6X1y/Whats-App-Image-2026-09-07-at-9-29-12-AM.jpg";

interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
  variant?: "default" | "light";
}

export function BrandLogo({
  className = "",
  showWordmark = true,
  variant = "default",
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={ignitedLogo}
        alt="Ignited BrandZ"
        width={160}
        height={72}
        className="h-14 w-auto shrink-0 object-contain sm:h-16"
      />
      {showWordmark && (
        <div className="leading-tight">
          <div
            className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
              variant === "light" ? "text-white/75" : "text-muted-foreground"
            }`}
          >
            Skincare Till
          </div>
        </div>
      )}
    </div>
  );
}
