"use client";

import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker } from "@/components/MapDynamic";
import { getAllPoints } from "@/lib/points";
import type { WorldPoint } from "@/types/api";

const CIRCUIT_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#10b981",
];

function WorldMap() {
  const { data: points, isLoading } = useQuery({
    queryKey: ["world-points"],
    queryFn: getAllPoints,
  });

  const circuitColorMap = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    const circuitIds = [...new Set((points ?? []).map((p) => p.circuit_id))];
    circuitIds.forEach((id, i) => {
      map.set(id, CIRCUIT_COLORS[i % CIRCUIT_COLORS.length]);
    });
    return map;
  }, [points]);

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      (points ?? []).map((p: WorldPoint) => ({
        id: p.id,
        lng: p.longitude,
        lat: p.latitude,
        category: p.category ?? undefined,
      })),
    [points],
  );

  const circuits = useMemo(() => {
    const map = new globalThis.Map<string, { title: string; color: string; count: number }>();
    (points ?? []).forEach((p) => {
      if (!map.has(p.circuit_id)) {
        map.set(p.circuit_id, {
          title: p.circuit_title,
          color: circuitColorMap.get(p.circuit_id) ?? "#3b82f6",
          count: 0,
        });
      }
      map.get(p.circuit_id)!.count++;
    });
    return [...map.entries()];
  }, [points, circuitColorMap]);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      <MapDynamic
        className="absolute inset-0 h-full w-full"
        markers={mapMarkers}
        interactive
        showStyleSwitcher
        center={[78.9629, 20.5937]}
        zoom={3}
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <h1 className="text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
          World Map
        </h1>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1120]/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!points || points.length === 0) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="mx-6 rounded-2xl bg-[#111a2e]/90 p-6 text-center backdrop-blur-xl ring-1 ring-white/10">
            <p className="text-lg font-semibold text-white">No points yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              Create a circuit and add points to see them on the world map.
            </p>
            <Link
              href="/circuits/new"
              className="mt-4 inline-block rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Create circuit
            </Link>
          </div>
        </div>
      )}

      {/* Circuit legend */}
      {circuits.length > 0 && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-10 rounded-xl bg-[#111a2e]/90 px-3 py-2 backdrop-blur-xl ring-1 ring-white/10">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Circuits
          </p>
          <div className="flex flex-col gap-1">
            {circuits.map(([circuitId, { title, color, count }]) => (
              <Link
                key={circuitId}
                href={`/circuits/${circuitId}`}
                className="flex items-center gap-2 rounded-lg px-1 py-0.5 active:bg-white/10"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-zinc-300">{title}</span>
                <span className="text-[10px] text-zinc-500">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorldPage() {
  return (
    <AuthGuard>
      <WorldMap />
    </AuthGuard>
  );
}
