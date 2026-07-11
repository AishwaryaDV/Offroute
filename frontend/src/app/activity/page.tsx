"use client";

import { ArrowLeft, Timer } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";

function Activity() {
  return (
    <div className="min-h-[100dvh] bg-[#0b1120]">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#0b1120]/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-xl">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] active:bg-white/[0.12]"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Activity
        </h1>
      </header>

      <main className="flex flex-col items-center px-5 pt-32">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
          <Timer size={28} className="text-white/30" />
        </div>
        <p className="mt-4 text-base font-medium text-white/60">Coming soon</p>
        <p className="mt-1 text-sm text-white/35">
          Your travel timeline will appear here
        </p>
      </main>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AuthGuard>
      <Activity />
    </AuthGuard>
  );
}
