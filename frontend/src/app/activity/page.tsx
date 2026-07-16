"use client";

import {
  Gem,
  Globe,
  Home,
  Landmark,
  Leaf,
  List,
  MapPin,
  Mountain,
  Timer,
  Utensils,
  Wine,
  X,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker } from "@/components/MapDynamic";
import { getAllPoints } from "@/lib/points";
import type { WorldPoint } from "@/types/api";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}>;

const CATEGORY_ICONS: Record<string, IconComponent> = {
  food: Utensils,
  drink: Wine,
  stay: Home,
  viewpoint: Mountain,
  activity: Zap,
  nature: Leaf,
  culture: Landmark,
  hidden_gem: Gem,
  other: MapPin,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#ef4444",
  drink: "#f59e0b",
  stay: "#8b5cf6",
  viewpoint: "#10b981",
  activity: "#f97316",
  nature: "#22c55e",
  culture: "#6366f1",
  hidden_gem: "#ec4899",
  other: "#3b82f6",
};

const CIRCUIT_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#10b981",
];

function Activity() {
  const router = useRouter();
  const [tab, setTab] = useState<"map" | "timeline">("timeline");

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

  const groupedByDate = useMemo(() => {
    const sorted = [...(points ?? [])].sort((a, b) => {
      if (!a.visited_at && !b.visited_at) return 0;
      if (!a.visited_at) return 1;
      if (!b.visited_at) return -1;
      return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime();
    });

    const groups: { label: string; points: WorldPoint[] }[] = [];
    let currentLabel = "";

    for (const p of sorted) {
      const label = p.visited_at
        ? new Date(p.visited_at).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Undated";

      if (label !== currentLabel) {
        groups.push({ label, points: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].points.push(p);
    }

    return groups;
  }, [points]);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      {/* Map tab: full-screen map */}
      {tab === "map" && (
        <>
          <MapDynamic
            className="absolute inset-0 h-full w-full"
            markers={mapMarkers}
            interactive
            center={[78.9629, 20.5937]}
            zoom={3}
          />

          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1120]/80">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
            </div>
          )}

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

          {circuits.length > 0 && (
            <div className="absolute bottom-24 left-4 z-10 rounded-xl bg-[#111a2e]/90 px-3 py-2 backdrop-blur-xl ring-1 ring-white/10">
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
        </>
      )}

      {/* Timeline tab: white sheet */}
      {tab === "timeline" && (
        <div className="flex h-full flex-col">
          <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
          <div className="flex-1 overflow-y-auto rounded-t-[28px] bg-white">
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

            {isLoading && (
              <div className="flex justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#0f1d32]" />
              </div>
            )}

            {!isLoading && groupedByDate.length === 0 && (
              <div className="px-5 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
                  <Timer size={28} className="text-gray-400" />
                </div>
                <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
                  No points yet
                </p>
                <p className="mt-1 text-base text-gray-500">
                  Add points to your circuits to build your timeline.
                </p>
              </div>
            )}

            {groupedByDate.length > 0 && (
              <div className="px-5 pb-28 pt-5">
                {groupedByDate.map((group) => (
                  <div key={group.label} className="mb-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {group.label}
                    </p>
                    <div className="relative border-l-2 border-gray-200 pl-5">
                      {group.points.map((point) => {
                        const Icon = CATEGORY_ICONS[point.category ?? "other"] ?? MapPin;
                        const color = CATEGORY_COLORS[point.category ?? "other"] ?? "#3b82f6";
                        return (
                          <Link
                            key={point.id}
                            href={`/circuits/${point.circuit_id}/points/${point.id}`}
                            className="relative -ml-[1.625rem] mb-3 flex gap-3 rounded-2xl bg-[#f5f6f8] p-4 active:bg-gray-100"
                          >
                            <div
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${color}15` }}
                            >
                              <Icon size={16} className="shrink-0" style={{ color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#0f1d32]">
                                {point.title}
                              </p>
                              <p className="truncate text-xs text-gray-400">
                                {point.circuit_title}
                                {point.category && ` · ${point.category.replace("_", " ")}`}
                              </p>
                              {point.notes && (
                                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                  {point.notes}
                                </p>
                              )}
                            </div>
                            {point.rating && (
                              <div className="shrink-0 self-start text-xs text-amber-500">
                                {"★".repeat(point.rating)}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab switcher — floating at bottom */}
      <div className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex justify-center">
        <div className="flex overflow-hidden rounded-full bg-[#0f1d32]/90 p-1 shadow-lg backdrop-blur-xl ring-1 ring-white/10">
          <button
            onClick={() => setTab("timeline")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "timeline"
                ? "bg-white text-[#0f1d32]"
                : "text-white/60 active:text-white"
            }`}
          >
            <List size={16} />
            Timeline
          </button>
          <button
            onClick={() => setTab("map")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "map"
                ? "bg-white text-[#0f1d32]"
                : "text-white/60 active:text-white"
            }`}
          >
            <Globe size={16} />
            World Map
          </button>
        </div>
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
