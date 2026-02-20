"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function GenerateQRPage() {
  const [amount, setAmount] = useState("2500");
  const [invoiceId, setInvoiceId] = useState("");
  const [note, setNote] = useState("");
  const [lockAmount, setLockAmount] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [merchantId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );
  const [lastInvoiceRef, setLastInvoiceRef] = useState("");

  const handleGenerate = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const normalizedAmount = parseFloat(amount) || 0;
    const invoiceRef = invoiceId.trim() || `INV-${Date.now()}`;

    const payload = {
      ver: 1,
      merchant_id: merchantId,
      amount: normalizedAmount,
      invoice_id: invoiceRef,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        amount: normalizedAmount,
        currency: "INR",
        invoice_ref: invoiceRef,
        note: note || undefined,
      },
      security: {
        offline_mode: true,
        hash: "a1b2c3d4...",
        lock_amt: lockAmount,
      },
    };

    setQrData(JSON.stringify(payload));
    setLastInvoiceRef(invoiceRef);
  };

  const handleReset = () => {
    setAmount("2500");
    setInvoiceId("");
    setNote("");
    setLockAmount(true);
    setQrData(null);
    setShowPayload(false);
    setLastInvoiceRef("");
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector(".qr-container svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 440;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, 440, 440);
      ctx!.drawImage(img, 0, 0, 440, 440);
      const a = document.createElement("a");
      a.download = `praharipay-qr-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share && qrData) {
      try {
        await navigator.share({ title: "PrahariPay QR", text: qrData });
      } catch { /* user cancelled */ }
    } else if (qrData) {
      await navigator.clipboard.writeText(qrData);
    }
  };

  const formatJSON = (obj: object) =>
    JSON.stringify(obj, null, 2);

  const parsedPayload = (() => {
    if (!qrData) return null;
    try {
      return JSON.parse(qrData);
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-(--color-border-subtle) bg-(--color-bg-app)">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dynamic QR Generator</h1>
            <p className="text-xs text-(--color-text-secondary) mt-1">
              Generate cryptographically signed QR codes for secure offline payments
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e9f8ef] text-[#1f8d52] text-xs border border-[#cde8d8]">
            <span className="w-2 h-2 rounded-full bg-[#1f8d52] animate-pulse" />
            System Online
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6 max-w-[1400px] w-full mx-auto">
          {/* Left: Transaction Form */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            <div className="pp-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-5">Transaction Details</h3>

              {/* Amount */}
              <div className="mb-4">
                <label className="text-xs text-(--color-text-secondary) mb-1.5 block">Amount (₹)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) text-lg">
                    currency_rupee
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-(--color-bg-muted) border border-(--color-border-subtle) text-(--color-text-primary) text-sm
                      focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] outline-none transition"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Invoice ID */}
              <div className="mb-4">
                <label className="text-xs text-(--color-text-secondary) mb-1.5 block">Invoice ID / Reference</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) text-lg">
                    tag
                  </span>
                  <input
                    type="text"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-(--color-bg-muted) border border-(--color-border-subtle) text-(--color-text-primary) text-sm
                      focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] outline-none transition"
                    placeholder="INV-2023-XXXX"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="text-xs text-(--color-text-secondary) mb-1.5 block">Customer Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg bg-(--color-bg-muted) border border-(--color-border-subtle) text-(--color-text-primary) text-sm resize-none
                    focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] outline-none transition"
                  placeholder="Optional payment note..."
                />
              </div>

              {/* Lock Amount Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-(--color-border-subtle)">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-(--color-text-secondary) text-lg">lock</span>
                  <span className="text-xs text-(--color-text-secondary)">Lock Amount</span>
                </div>
                <button
                  onClick={() => setLockAmount(!lockAmount)}
                  title="Toggle lock amount"
                  aria-label="Toggle lock amount"
                  className={`w-10 h-5 rounded-full transition-all flex items-center ${
                    lockAmount ? "bg-(--color-primary) justify-end" : "bg-[#ccc3b3] justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white mx-0.5" />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-lg bg-(--color-bg-muted) text-(--color-text-secondary) text-xs font-semibold border border-(--color-border-subtle) hover:text-(--color-text-primary) transition"
                >
                  Reset
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 py-2.5 rounded-lg pp-btn-primary text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Generate QR
                </button>
              </div>
            </div>

            {/* Offline Info */}
            <div className="rounded-xl border border-dashed border-(--color-border-subtle) bg-(--color-bg-card) p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-(--color-primary) text-lg mt-0.5">wifi_off</span>
              <div>
                <p className="text-xs font-semibold">Offline-First Protocol</p>
                <p className="text-[10px] text-(--color-text-secondary) mt-1 leading-relaxed">
                  QR codes are cryptographically signed and work without internet.
                  Transactions sync automatically when connectivity returns.
                </p>
              </div>
            </div>
          </div>

          {/* Right: QR Preview */}
          <div className="col-span-12 lg:col-span-7">
            <div className="pp-card rounded-2xl overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-(--color-border-subtle)">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Live Preview</span>
                  {qrData && (
                    <span className="flex items-center gap-1 text-[10px] text-[#1f8d52]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1f8d52] animate-pulse" />
                      Ready
                    </span>
                  )}
                </div>
                {qrData && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleDownloadQR}
                      className="w-7 h-7 rounded-md bg-(--color-bg-muted) border border-(--color-border-subtle) flex items-center justify-center hover:border-[#d7b68d] transition"
                      title="Download QR"
                    >
                      <span className="material-symbols-outlined text-(--color-text-secondary) text-sm">download</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-7 h-7 rounded-md bg-(--color-bg-muted) border border-(--color-border-subtle) flex items-center justify-center hover:border-[#d7b68d] transition"
                      title="Share"
                    >
                      <span className="material-symbols-outlined text-(--color-text-secondary) text-sm">share</span>
                    </button>
                  </div>
                )}
              </div>

              {/* QR Display */}
              <div className="flex flex-col items-center py-8 px-6">
                {qrData ? (
                  <>
                    <div className="qr-container bg-white p-6 rounded-2xl shadow-lg shadow-[#3abff8]/10">
                      <QRCodeSVG
                        value={qrData}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#1e1d1a"
                        level="H"
                      />
                    </div>
                    <p className="text-sm font-semibold mt-4">
                      PrahariPay Invoice #{lastInvoiceRef}
                    </p>
                    <p className="text-xl font-bold text-(--color-primary) mt-1">
                      ₹{parseFloat(amount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </>
                ) : (
                  <div className="py-16 text-center">
                    <span className="material-symbols-outlined text-(--color-text-muted) text-6xl mb-3">qr_code_2</span>
                    <p className="text-sm text-(--color-text-secondary)">Enter details and click Generate</p>
                    <p className="text-[10px] text-(--color-text-muted) mt-1">QR preview will appear here</p>
                  </div>
                )}
              </div>

              {/* Payload JSON */}
              {qrData && (
                <div className="border-t border-(--color-border-subtle)">
                  <button
                    onClick={() => setShowPayload(!showPayload)}
                    className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-(--color-text-secondary) hover:text-(--color-primary) transition"
                  >
                    <span className="font-mono">payload.json</span>
                    <span className="material-symbols-outlined text-sm">
                      {showPayload ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {showPayload && (
                    <div className="px-5 pb-4">
                      <pre className="bg-(--color-bg-muted) rounded-lg p-4 text-[11px] font-mono text-(--color-text-secondary) overflow-x-auto border border-(--color-border-subtle)">
                        {parsedPayload ? formatJSON(parsedPayload) : "{}"}
                      </pre>
                      <div className="flex items-center gap-2 mt-3 text-[#1f8d52] text-[10px]">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Payload Validated
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}