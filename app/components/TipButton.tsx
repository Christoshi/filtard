"use client";

import { useState, useEffect } from "react";

type Props = {
  username: string;
  solWallet: string | null;
  evmWallet: string | null;
};

export default function TipButton({ username, solWallet, evmWallet }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [solLoaded, setSolLoaded] = useState(false);
  const [evmLoaded, setEvmLoaded] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Reset loaded states when closing so next open is clean
      setSolLoaded(false);
      setEvmLoaded(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!solWallet && !evmWallet) return null;

  const copy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const truncate = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1f26] border border-[#2a2e38] text-[#b8ff3d] text-sm font-medium hover:bg-[#252830] hover:border-[#3a3f4b] transition"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        Tip
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-sm rounded-2xl border border-[#2a2e38] bg-[#0a0b0e] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1f26]">
              <h3 className="text-[15px] font-medium text-white">
                Tip {username}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#8b93a1] hover:text-white transition p-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <p className="text-xs text-[#8b93a1] mb-5">
                Support this curator with any amount
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {solWallet && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9945FF]" />
                      <span className="text-xs font-medium text-[#c8cdd5]">Solana</span>
                    </div>

                    <div className="relative w-[120px] h-[120px] mb-2.5">
                      {/* Placeholder */}
                      {!solLoaded && (
                        <div className="absolute inset-0 rounded-lg border border-[#1c1f26] bg-[#101215] animate-pulse" />
                      )}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${solWallet}&bgcolor=0a0b0e&color=f4f6f8&margin=8`}
                        alt="Solana QR"
                        className={`rounded-lg border border-[#1c1f26] transition-opacity duration-200 ${
                          solLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        onLoad={() => setSolLoaded(true)}
                      />
                    </div>

                    <div className="w-full flex items-center gap-1.5">
                      <code className="flex-1 text-[11px] text-[#8b93a1] bg-[#101215] border border-[#1c1f26] rounded-md px-2 py-1.5 truncate text-center">
                        {truncate(solWallet)}
                      </code>
                      <button
                        onClick={() => copy(solWallet, "sol")}
                        className="px-2 py-1.5 rounded-md bg-[#1c1f26] text-[11px] font-medium hover:bg-[#2a2e38] transition whitespace-nowrap"
                      >
                        {copied === "sol" ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {evmWallet && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#627EEA]" />
                      <span className="text-xs font-medium text-[#c8cdd5]">EVM</span>
                    </div>

                    <div className="relative w-[120px] h-[120px] mb-2.5">
                      {/* Placeholder */}
                      {!evmLoaded && (
                        <div className="absolute inset-0 rounded-lg border border-[#1c1f26] bg-[#101215] animate-pulse" />
                      )}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${evmWallet}&bgcolor=0a0b0e&color=f4f6f8&margin=8`}
                        alt="EVM QR"
                        className={`rounded-lg border border-[#1c1f26] transition-opacity duration-200 ${
                          evmLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        onLoad={() => setEvmLoaded(true)}
                      />
                    </div>

                    <div className="w-full flex items-center gap-1.5">
                      <code className="flex-1 text-[11px] text-[#8b93a1] bg-[#101215] border border-[#1c1f26] rounded-md px-2 py-1.5 truncate text-center">
                        {truncate(evmWallet)}
                      </code>
                      <button
                        onClick={() => copy(evmWallet, "evm")}
                        className="px-2 py-1.5 rounded-md bg-[#1c1f26] text-[11px] font-medium hover:bg-[#2a2e38] transition whitespace-nowrap"
                      >
                        {copied === "evm" ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}