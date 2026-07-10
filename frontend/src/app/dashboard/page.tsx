"use client";

import { Plus, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getMe } from "@/lib/me";
import { getCircuits } from "@/lib/circuits";

function Dashboard() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });

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
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : circuits && circuits.length > 0 ? (
          <div className="space-y-3">
            {circuits.map((circuit) => (
              <Link
                key={circuit.id}
                href={`/circuits/${circuit.id}`}
                className="block rounded-2xl bg-white p-4 ring-1 ring-zinc-100 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:active:bg-zinc-800"
              >
                <p className="font-semibold text-black dark:text-white">
                  {circuit.title}
                </p>
                {circuit.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                    {circuit.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-400">
                  {circuit.point_count} {circuit.point_count === 1 ? "point" : "points"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center dark:bg-zinc-900">
            <p className="text-base text-zinc-500">
              No circuits yet — tap + to start your first one.
            </p>
          </div>
        )}
      </main>

      <Link
        href="/circuits/new"
        className="fixed bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-black shadow-lg active:bg-zinc-800 dark:bg-white dark:active:bg-zinc-200"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        aria-label="New circuit"
      >
        <Plus size={26} className="text-white dark:text-black" />
      </Link>
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
