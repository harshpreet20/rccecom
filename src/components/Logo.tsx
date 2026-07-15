import { storeConfig } from "@/lib/config";

/** RCC gold crest roundel + full wordmark (dark theme). */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="relative grid h-11 w-11 flex-none place-items-center rounded-full border-2 border-rcc-gold/70 bg-rcc-night text-rcc-gold shadow-[0_0_20px_rgba(201,162,75,0.25)]">
        <span className="text-sm font-black leading-none tracking-tighter">
          RCC
        </span>
      </span>
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
