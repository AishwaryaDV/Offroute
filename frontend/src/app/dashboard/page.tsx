"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getMe } from "@/lib/me";

function Dashboard() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black">
      <main className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            My Circuits
          </h1>
          <Link href="/settings" className="text-sm text-zinc-500 underline">
            Settings
          </Link>
        </header>

        {me && (
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            Welcome{me.display_name ? `, ${me.display_name}` : ""} 👋
          </p>
        )}

        <div className="rounded-xl bg-white p-10 text-center dark:bg-zinc-900">
          <p className="text-zinc-500">
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
