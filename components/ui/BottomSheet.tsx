"use client";

import type { ReactNode } from "react";

export default function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-5" role="dialog" aria-modal="true" aria-label="Recovery details">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="sheet-rise relative z-10 w-full max-w-md rounded-[2rem] bg-[#151d28] p-6 shadow-2xl shadow-black/50">
        <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-white/15" />
        {children}
      </div>
    </div>
  );
}
