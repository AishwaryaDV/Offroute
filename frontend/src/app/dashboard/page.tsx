"use client";

import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getMe } from "@/lib/me";

function Dashboard() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-zinc-50/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md dark:bg-black/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            My Circuits
          </h1>
          {me?.display_name && (
            <p className="mt-0.5 text-sm text-zinc-500">
              Hi, {me.display_name}
            </p>
          )}
        </div>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800"
          aria-label="Settings"
        >
          <Settings size={22} className="text-zinc-600 dark:text-zinc-400" />
        </Link>
      </header>

      <main className="px-5 pb-8">
        <div className="rounded-2xl bg-white p-8 text-center dark:bg-zinc-900 sm:mx-auto sm:max-w-lg">
          <p className="text-base text-zinc-500">
            No circuits yet — circuit building arrives in Phase 2.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
