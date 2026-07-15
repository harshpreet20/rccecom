import { storeConfig } from "@/lib/config";

/** RCC gold crest roundel + full wordmark (dark theme). */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/rcc-crest.webp"
        alt="Racquets Club Community crest"
        width={44}
        height={44}
        className="h-11 w-11 flex-none object-contain drop-shadow-[0_0_18px_rgba(201,162,75,0.28)]"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-rcc-sand sm:text-base">
            {storeConfig.name}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-rcc-gold/80">
            Delhi • Est 2024
          </span>
        </span>
      )}
    </span>
  );
}
