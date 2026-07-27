"use client";

import { useState } from "react";

/**
 * Size charts for the RCC apparel, in inches (EIGHTX ready-garment sizing).
 * The RCC Pro Jersey is a half-sleeve kit, so we show the half-sleeve jersey
 * measurements plus the matching shorts chart. Tolerance ≈ ±0.5 inch.
 */

// Exported (not just local) so the AI assistant (src/lib/assistant/context.ts)
// can quote the exact same numbers instead of guessing at sizing.
export const JERSEY_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
export const JERSEY_NOMINAL = [32, 34, 36, 38, 40, 42, 44, 46, 48, 50];
export const JERSEY_ROWS: { label: string; values: (number | string)[] }[] = [
  { label: "Chest", values: [33, 35, 37, 39, 41, 43, 45, 47, 49, 51] },
  { label: "Length", values: [24.5, 25.5, 26.5, 27.5, 28.5, 29.5, 30.5, 31.5, 32.5, 33] },
  { label: "Shoulder", values: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
  { label: "Half sleeve", values: [7, 7.25, 7.5, 8, 8.25, 8.5, 9, 9.25, 9.5, 10] },
  { label: "Sleeve opening", values: [10, 11, 11.5, 12, 13, 13.5, 14, 14.5, 15, 15.5] },
];

export const SHORTS_SIZES = ["S", "M", "L", "XL", "XXL"];
export const SHORTS_NOMINAL = [36, 38, 40, 42, 44];
export const SHORTS_ROWS: { label: string; values: number[] }[] = [
  { label: "Waist length", values: [15, 16, 17, 18, 19] },
  { label: "Thigh", values: [23, 24, 25, 25, 26.5] },
  { label: "Bottom", values: [20, 21, 22, 23, 24] },
];

function Table({
  title,
  sizes,
  nominal,
  rows,
}: {
  title: string;
  sizes: string[];
  nominal: number[];
  rows: { label: string; values: (number | string)[] }[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-black uppercase tracking-wide text-rcc-green">
        {title} <span className="font-medium text-rcc-green/50">(inches)</span>
      </h4>
      <div className="overflow-x-auto rounded-xl border border-rcc-green/10">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-rcc-green text-rcc-sand">
              <th className="px-3 py-2 text-left font-bold">Size</th>
              {sizes.map((s, i) => (
                <th key={s} className="px-2 py-2 text-center font-bold">
                  {s}
                  <span className="block text-[10px] font-medium text-rcc-lime">
                    {nominal[i]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.label} className={ri % 2 ? "bg-rcc-sand" : "bg-white"}>
                <td className="px-3 py-2 font-semibold text-rcc-green">{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={i} className="px-2 py-2 text-center text-rcc-ink/80">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SizeChart({ withShorts = false }: { withShorts?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-rcc-leaf hover:underline"
      >
        📏 Size chart
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-rcc-sand p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-rcc-green">Size guide</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-rcc-green hover:bg-rcc-green/10"
                aria-label="Close size chart"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <Table title="Jersey" sizes={JERSEY_SIZES} nominal={JERSEY_NOMINAL} rows={JERSEY_ROWS} />
              {withShorts && (
                <Table title="Shorts" sizes={SHORTS_SIZES} nominal={SHORTS_NOMINAL} rows={SHORTS_ROWS} />
              )}

              <div className="rounded-xl bg-white p-4 text-sm leading-relaxed text-rcc-green/80">
                <p className="font-bold text-rcc-green">How to measure</p>
                <ul className="mt-1 space-y-1 text-rcc-green/70">
                  <li>• <b>Chest</b> — measure under your arms, around the fullest part of your chest.</li>
                  <li>• <b>Length</b> — from the highest point of the shoulder seam to the bottom hem.</li>
                  {withShorts && (
                    <li>• <b>Waist length</b> — from the top of the waistband to the bottom hem.</li>
                  )}
                </ul>
                <p className="mt-2 text-rcc-green/70">
                  <b>Fit tip:</b> on the borderline between two sizes, pick the smaller for a
                  tighter fit or the larger for a looser fit.
                </p>
                <p className="mt-2 text-xs font-semibold text-rcc-clay">
                  There may be a tolerance of ±0.5 inch depending on the size.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
