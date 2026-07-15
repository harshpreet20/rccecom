"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildUpiUri } from "@/lib/upi";
import { storeConfig } from "@/lib/config";
import { formatMoney } from "@/lib/format";

/**
 * Renders a scannable UPI QR code for a given amount, plus a "Pay in app"
 * deep link for customers viewing on the same phone.
 */
export function UpiQr({
  amount,
  note,
  orderRef,
}: {
  amount: number;
  note: string;
  orderRef: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const uri = buildUpiUri({ amount, note, txnRef: orderRef });

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(uri, {
      width: 320,
      margin: 1,
      color: { dark: "#0f3d2e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        /* leave blank; deep-link button still works */
      });
    return () => {
      active = false;
    };
  }, [uri]);

  return (
    <div className="flex flex-col items-center rounded-2xl border border-rcc-green/10 bg-white p-5 text-center">
      <p className="text-sm font-semibold text-rcc-green/70">
        Scan to pay {formatMoney(amount)}
      </p>
      <div className="my-3 grid h-[280px] w-[280px] place-items-center rounded-xl bg-white ring-1 ring-rcc-green/10">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`UPI QR code to pay ${formatMoney(amount)} to ${storeConfig.upiPayeeName}`}
            width={280}
            height={280}
          />
        ) : (
          <span className="text-sm text-rcc-green/40">Generating QR…</span>
        )}
      </div>

      <div className="text-xs text-rcc-green/60">
        <p className="font-bold text-rcc-green">{storeConfig.upiPayeeName}</p>
        <p>{storeConfig.upiId}</p>
        <p className="mt-1">
          Ref: <span className="font-mono">{orderRef}</span>
        </p>
      </div>

      {/* On a phone, this opens the UPI app directly. */}
      <a
        href={uri}
        className="mt-4 w-full rounded-full bg-rcc-green py-2.5 text-sm font-bold text-rcc-sand transition hover:bg-rcc-leaf sm:hidden"
      >
        Open UPI app to pay
      </a>

      <p className="mt-3 text-[11px] leading-relaxed text-rcc-green/50">
        Works with GPay, PhonePe, Paytm, BHIM &amp; any UPI app. Please pay the
        exact amount and keep the UPI reference / UTR number handy.
      </p>
    </div>
  );
}
