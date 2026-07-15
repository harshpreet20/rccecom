import { storeConfig } from "@/lib/config";

/** Compact RCC roundel mark + wordmark. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-rcc-lime text-rcc-green shadow-sm ring-2 ring-rcc-green/20">
        <span className="text-lg font-black leading-none tracking-tighter">
          RCC
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-extrabold uppercase tracking-widest">
          {storeConfig.shortName}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-rcc-leaf">
          Merch Store
        </span>
      </span>
    </span>
  );
}
