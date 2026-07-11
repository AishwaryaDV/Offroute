"use client";

import { Timer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";

function Activity() {
  const router = useRouter();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-white">
      <header className="flex items-start justify-between px-5 pt-5">
        <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
          Activity
        </h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
          aria-label="Close"
        >
          <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
        </button>
      </header>

      <main className="flex flex-col items-center px-5 pt-32 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
          <Timer size={28} className="text-gray-400" />
        </div>
        <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
          Coming soon
        </p>
        <p className="mt-1 text-base text-gray-500">
          Your travel timeline will appear here
        </p>
      </main>
      </div>
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
