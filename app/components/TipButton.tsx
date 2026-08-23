"use client";

import { useState } from "react";

type Props = {
  username: string;
  solWallet: string | null;
  evmWallet: string | null;
};

export default function TipButton({ username, solWallet, evmWallet }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!solWallet && !evmWallet) return null;

  const copy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#b8ff3d]/10 border border-[#b8ff3d]/30 text-[#b8ff3d] text-sm font-medium hover:bg-[#b8ff3d]/20 hover:border-[#b8ff3d]/50 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Tip
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl border border-[#2a2e38] bg-[#0a0b0e] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1f26]">
              <h3 className="text-lg font-medium text-white">
                Tip {username}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#8b93a1] hover:text-white transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6">
              <p className="text-sm text-[#8b93a1]">
                Support this curator with any amount
              </p>

              {solWallet && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#9945FF]" />
                    <span className="text-sm font-medium text-white">Solana</span>
                  </div>

                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${solWallet}&bgcolor=0a0b0e&color=f4f6f8`}
                      alt="Solana QR"
                      className="rounded-xl border border-[#1c1f26]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-[#c8cdd5] bg-[#101215] border border-[#1c1f26] rounded-lg px-3 py-2.5 truncate">
                      {solWallet}
                    </code>
                    <button
                      onClick={() => copy(solWallet, "sol")}
                      className="px-3 py-2.5 rounded-lg bg-[#1c1f26] text-xs font-medium hover:bg-[#2a2e38] transition"
                    >
                      {copied === "sol" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {evmWallet && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#627EEA]" />
                    <span className="text-sm font-medium text-white">EVM</span>
                  </div>

                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${evmWallet}&bgcolor=0a0b0e&color=f4f6f8`}
                      alt="EVM QR"
                      className="rounded-xl border border-[#1c1f26]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-[#c8cdd5] bg-[#101215] border border-[#1c1f26] rounded-lg px-3 py-2.5 truncate">
                      {evmWallet}
                    </code>
                    <button
                      onClick={() => copy(evmWallet, "evm")}
                      className="px-3 py-2.5 rounded-lg bg-[#1c1f26] text-xs font-medium hover:bg-[#2a2e38] transition"
                    >
                      {copied === "evm" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}