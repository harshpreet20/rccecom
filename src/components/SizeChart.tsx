"use client";

import { useState } from "react";
import type { SizeChartData } from "@/lib/size-charts";

function Table({ chart }: { chart: SizeChartData }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-black uppercase tracking-wide text-rcc-green">
        {chart.name} <span className="font-medium text-rcc-green/50">(inches)</span>
      </h4>
      <div className="overflow-x-auto rounded-xl border border-rcc-green/10">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-rcc-green text-rcc-sand">
              <th className="px-3 py-2 text-left font-bold">Size</th>
              {chart.sizes.map((s, i) => (
                <th key={s} className="px-2 py-2 text-center font-bold">
                  {s}
                  {chart.nominal[i] != null && (
                    <span className="block text-[10px] font-medium text-rcc-lime">{chart.nominal[i]}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((r, ri) => (
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

/** Size guide modal, driven entirely by CRM-managed charts -- pass whichever charts apply to the product. */
export function SizeChart({ charts }: { charts: SizeChartData[] }) {
  const [open, setOpen] = useState(false);
  if (charts.length === 0) return null;

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
              {charts.map((chart) => (
                <Table key={chart.slug} chart={chart} />
              ))}

              <div className="rounded-xl bg-white p-4 text-sm leading-relaxed text-rcc-green/80">
                <p className="font-bold text-rcc-green">How to measure</p>
                <p className="mt-1 text-rcc-green/70">
                  Lay a similar well-fitting garment flat and measure across, or have someone measure you directly.
                  On the borderline between two sizes, pick the smaller for a tighter fit or the larger for a looser fit.
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
