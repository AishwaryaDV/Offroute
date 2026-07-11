"use client";

import { MapPin, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { getCircuits } from "@/lib/circuits";
import { getMe } from "@/lib/me";
import type { Circuit } from "@/types/api";

function formatDates(circuit: Circuit): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (circuit.start_date && circuit.end_date)
    return `${fmt(circuit.start_date)} – ${fmt(circuit.end_date)}`;
  if (circuit.start_date) return fmt(circuit.start_date);
  return fmt(circuit.created_at);
}

function CircuitsList() {
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-white">
      <header className="sticky top-0 z-10 rounded-t-[28px] bg-white px-5 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
            Circuits
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
            aria-label="Close"
          >
            <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
          </button>
        </div>
        {me && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f1d32]/10 text-xs font-bold text-[#0f1d32]">
              {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
            </div>
            <p className="text-base text-gray-500">
              {me.display_name ?? "You"} ·{" "}
              {circuits
                ? `${circuits.length} ${circuits.length === 1 ? "circuit" : "circuits"}`
                : "…"}
            </p>
          </div>
        )}
      </header>

      <main className="pb-10">
        {isLoading ? (
          <div className="space-y-6 px-5 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : circuits && circuits.length > 0 ? (
          circuits.map((circuit, i) => (
            <div key={circuit.id}>
              {i > 0 && <div className="h-2 bg-[#f5f6f8]" />}
              <Link
                href={`/circuits/${circuit.id}`}
                className="block px-5 py-5 active:bg-gray-50"
              >
                <p className="text-2xl font-bold text-[#0f1d32]">
                  {circuit.title}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-base text-gray-500">
                  <span>
                    {circuit.point_count}{" "}
                    {circuit.point_count === 1 ? "point" : "points"}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{circuit.visibility}</span>
                  <span>·</span>
                  <span>{formatDates(circuit)}</span>
                </div>
                {circuit.description && (
                  <p className="mt-2 line-clamp-2 text-base text-gray-600">
                    {circuit.description}
                  </p>
                )}
              </Link>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center px-5 pt-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
              <MapPin size={28} className="text-gray-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
              No circuits yet
            </p>
            <p className="mt-1 text-base text-gray-500">
              Tap Add on the home screen to start your first one
            </p>
          </div>
        )}
      </main>
      </div>
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
