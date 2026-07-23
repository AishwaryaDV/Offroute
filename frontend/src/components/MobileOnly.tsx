"use client";

import { Compass, Smartphone } from "lucide-react";

export function MobileOnly({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile content */}
      <div className="contents md:hidden">{children}</div>

      {/* Desktop/tablet block */}
      <div className="hidden md:flex h-[100dvh] flex-col items-center justify-center bg-[#060d1b] px-8 text-center">
        <div className="flex items-center gap-2.5 mb-6">
          <Compass size={28} className="text-white/70" />
          <span className="text-2xl font-bold tracking-tight text-white/90">Offroute</span>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08] mb-5">
          <Smartphone size={28} className="text-white/60" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Mobile only</h2>
        <p className="max-w-xs text-sm leading-relaxed text-white/40">
          Offroute is designed for phones. Open this link on your mobile browser to get started.
        </p>
        <p className="mt-6 text-xs text-white/20">
          offroute.app
        </p>
      </div>
    </>
  );
}
