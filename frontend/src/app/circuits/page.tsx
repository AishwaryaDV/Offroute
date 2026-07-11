"use client";

import { ArrowLeft, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getCircuits } from "@/lib/circuits";

function CircuitsList() {
  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });

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
          All Circuits
        </h1>
      </header>

      <main className="px-5 pb-10">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : circuits && circuits.length > 0 ? (
          <div className="space-y-3">
            {circuits.map((circuit) => (
              <Link
                key={circuit.id}
                href={`/circuits/${circuit.id}`}
                className="flex items-start gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08] active:bg-white/[0.1]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <MapPin size={20} className="text-white/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{circuit.title}</p>
                  {circuit.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/50">
                      {circuit.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/35">
                    <span>
                      {circuit.point_count}{" "}
                      {circuit.point_count === 1 ? "point" : "points"}
                    </span>
                    <span className="capitalize">{circuit.visibility}</span>
                    <span>
                      {new Date(circuit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-white/[0.04] p-10 text-center ring-1 ring-white/[0.06]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
              <MapPin size={24} className="text-white/40" />
            </div>
            <p className="text-base font-medium text-white/70">
              No circuits yet
            </p>
            <p className="mt-1 text-sm text-white/40">
              Create one from the map view
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CircuitsPage() {
  return (
    <AuthGuard>
      <CircuitsList />
    </AuthGuard>
  );
}
