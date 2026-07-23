"use client";

import {
  CalendarDays,
  Compass,
  Flag,
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
  ArrowLeft,
  Minus,
  Plus,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import type { MapMarker, MapHandle, CircuitRoute } from "@/components/MapDynamic";
import { getAllPoints } from "@/lib/points";
import { useUserLocation } from "@/hooks/useUserLocation";
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

const CIRCUIT_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#10b981",
];

function Activity() {
  const router = useRouter();
  const userGeo = useUserLocation();
  const mapHandleRef = useRef<MapHandle | null>(null);
  const [tab, setTab] = useState<"map" | "timeline">("timeline");

  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

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

  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(null);

  const circuitRoutes: CircuitRoute[] = useMemo(() => {
    const grouped = new globalThis.Map<string, WorldPoint[]>();
    (points ?? []).forEach((p) => {
      if (!grouped.has(p.circuit_id)) grouped.set(p.circuit_id, []);
      grouped.get(p.circuit_id)!.push(p);
    });
    const routes: CircuitRoute[] = [];
    grouped.forEach((pts, circuitId) => {
      const sorted = [...pts].sort((a, b) => a.order_index - b.order_index);
      if (sorted.length >= 2) {
        routes.push({
          id: circuitId,
          color: circuitColorMap.get(circuitId) ?? "#3b82f6",
          coordinates: sorted.map((p) => [p.longitude, p.latitude] as [number, number]),
        });
      }
    });
    return routes;
  }, [points, circuitColorMap]);

  const selectedCircuit = useMemo(() => {
    if (!selectedCircuitId) return null;
    const info = circuits.find(([id]) => id === selectedCircuitId);
    if (!info) return null;
    const circuitPoints = (points ?? [])
      .filter((p) => p.circuit_id === selectedCircuitId)
      .sort((a, b) => a.order_index - b.order_index);
    return { id: info[0], title: info[1].title, color: info[1].color, points: circuitPoints };
  }, [selectedCircuitId, circuits, points]);

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      const point = (points ?? []).find((p) => p.id === markerId);
      if (point) {
        setSelectedCircuitId(point.circuit_id);
      }
    },
    [points],
  );

  type TimelineItem =
    | { type: "date"; label: string }
    | { type: "circuit-start"; title: string }
    | { type: "circuit-end"; title: string }
    | { type: "point"; point: WorldPoint };

  const timelineItems = useMemo(() => {
    const sorted = [...(points ?? [])].sort((a, b) => {
      if (!a.visited_at && !b.visited_at) return 0;
      if (!a.visited_at) return 1;
      if (!b.visited_at) return -1;
      return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime();
    });

    const items: TimelineItem[] = [];
    let currentDate = "";
    let currentCircuit = "";

    for (const p of sorted) {
      const dateLabel = p.visited_at
        ? new Date(p.visited_at).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Undated";

      if (dateLabel !== currentDate) {
        items.push({ type: "date", label: dateLabel });
        currentDate = dateLabel;
      }

      if (p.circuit_id !== currentCircuit) {
        items.push({ type: "circuit-start", title: p.circuit_title });
        currentCircuit = p.circuit_id;
      }

      items.push({ type: "point", point: p });
    }

    const lastIdx = new globalThis.Map<string, number>();
    items.forEach((item, i) => {
      if (item.type === "point") lastIdx.set(item.point.circuit_id, i);
    });
    const inserts = [...lastIdx.entries()].sort(([, a], [, b]) => b - a);
    for (const [circuitId, idx] of inserts) {
      const p = (items[idx] as { type: "point"; point: WorldPoint }).point;
      items.splice(idx + 1, 0, { type: "circuit-end", title: p.circuit_title });
    }

    return items;
  }, [points]);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      {/* Map tab: full-screen map */}
      {tab === "map" && (
        <>
          <MapDynamic
            className="absolute inset-0 h-full w-full"
            markers={mapMarkers}
            circuitRoutes={circuitRoutes}
            highlightCircuitId={selectedCircuitId ?? undefined}
            fitToMarkers={false}
            interactive
            userLocation={userLoc ?? undefined}
            center={[0, 20]}
            zoom={1.5}
            onMarkerClick={handleMarkerClick}
            onMapClick={() => setSelectedCircuitId(null)}
            onMapInit={(handle) => { mapHandleRef.current = handle; }}
          />

          <button
            onClick={() => router.back()}
            className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm active:bg-white"
          >
            <ArrowLeft size={20} className="text-[#0f1d32]" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-[calc(56px+max(0.75rem,env(safe-area-inset-bottom))+1rem)] right-4 z-10 flex flex-col gap-2">
            <button
              onClick={() => mapHandleRef.current?.zoomIn()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:bg-black/60"
              aria-label="Zoom in"
            >
              <Plus size={18} className="text-white" />
            </button>
            <button
              onClick={() => mapHandleRef.current?.zoomOut()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:bg-black/60"
              aria-label="Zoom out"
            >
              <Minus size={18} className="text-white" />
            </button>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1120]/80">
              <StepLoader variant="dark" />
            </div>
          )}

          {!isLoading && (!points || points.length === 0) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="mx-6 rounded-2xl bg-white/95 p-6 text-center shadow-xl backdrop-blur-xl">
                <p className="text-lg font-semibold text-[#0f1d32]">No points yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Create a circuit and add points to see them on the world map.
                </p>
                <Link
                  href="/circuits/new"
                  className="mt-4 inline-block rounded-full bg-[#0f1d32] px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Create circuit
                </Link>
              </div>
            </div>
          )}

          {/* Bottom circuit card — appears when a point is tapped */}
          {selectedCircuit && (
            <div className="absolute inset-x-0 bottom-[calc(56px+max(0.75rem,env(safe-area-inset-bottom)))] z-10 px-4">
              <div className="rounded-2xl bg-[#f5f6f8] p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedCircuit.color }}
                    />
                    <Link
                      href={`/circuits/${selectedCircuit.id}`}
                      className="text-base font-bold text-[#0f1d32] active:opacity-70"
                    >
                      {selectedCircuit.title}
                    </Link>
                  </div>
                  <button
                    onClick={() => setSelectedCircuitId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white active:bg-gray-100"
                  >
                    <X size={16} className="text-[#0f1d32]" />
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedCircuit.points.map((p) => {
                    const Icon = CATEGORY_ICONS[p.category ?? "other"] ?? MapPin;
                    return (
                      <Link
                        key={p.id}
                        href={`/circuits/${p.circuit_id}/points/${p.id}`}
                        className="flex min-w-[140px] shrink-0 gap-2.5 rounded-xl bg-white p-3 active:bg-gray-50"
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${selectedCircuit.color}15` }}
                        >
                          <Icon size={14} style={{ color: selectedCircuit.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#0f1d32]">
                            {p.title}
                          </p>
                          <p className="truncate text-[10px] text-gray-400">
                            {p.category?.replace("_", " ") ?? "point"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Timeline tab: sheet over map peek */}
      {tab === "timeline" && (
        <>
        <div className="pointer-events-none absolute inset-0">
          <MapDynamic center={userGeo.center} zoom={Math.min(userGeo.zoom, 3)} />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        </div>
        <div
          className="sheet-up sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-y-auto rounded-t-[28px] bg-white"
          style={{ paddingBottom: "calc(80px + max(0.75rem, env(safe-area-inset-bottom)))" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>
          <header className="flex items-start justify-between px-5 pt-2 pb-4">
            <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
              Activity
            </h1>
            <button
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white active:bg-gray-100"
              aria-label="Close"
            >
              <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
            </button>
          </header>

          {isLoading && (
            <div className="flex justify-center py-20">
              <StepLoader variant="light" />
            </div>
          )}

          {!isLoading && timelineItems.length === 0 && (
            <div className="px-5 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
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

          {timelineItems.length > 0 && (
            <div className="flex flex-col items-center px-5 pb-8">
              {timelineItems.map((item, idx) => {
                if (item.type === "date") {
                  return (
                    <div key={`date-${idx}`} className="flex w-full flex-col items-center">
                      {idx > 0 && <div className="h-5 w-0.5 bg-gray-200" />}
                      <div className="flex items-center gap-2.5 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                          <CalendarDays size={14} className="text-gray-400" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0f1d32]">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === "circuit-start") {
                  return (
                    <div key={`cs-${idx}`} className="flex w-full flex-col items-center">
                      <div className="h-4 w-0.5 bg-gray-200" />
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                          <Compass size={11} className="text-gray-400" />
                        </div>
                        <span className="truncate text-[11px] font-semibold text-gray-400">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === "circuit-end") {
                  return (
                    <div key={`ce-${idx}`} className="flex w-full flex-col items-center">
                      <div className="h-4 w-0.5 bg-gray-200" />
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                          <Flag size={11} className="text-gray-400" />
                        </div>
                        <span className="truncate text-[11px] font-semibold text-gray-400">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  );
                }

                const point = item.point;
                const Icon = CATEGORY_ICONS[point.category ?? "other"] ?? MapPin;
                const circuitColor = circuitColorMap.get(point.circuit_id) ?? "#3b82f6";

                return (
                  <div key={point.id} className="flex w-full flex-col items-center">
                    <div className="h-3 w-0.5 bg-gray-200" />
                    <Link
                      href={`/circuits/${point.circuit_id}/points/${point.id}`}
                      className="w-full rounded-2xl bg-[#f5f6f8] p-3.5 active:bg-gray-100"
                    >
                      <div className="flex gap-3">
                        <div
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${circuitColor}15` }}
                        >
                          <Icon size={16} className="shrink-0" style={{ color: circuitColor }} />
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
                      </div>
                    </Link>
                  </div>
                );
              })}
              <div className="h-4 w-0.5 bg-gray-200" />
              <div className="h-2 w-2 rounded-full bg-gray-200" />
              <p className="pt-8 pb-4 text-center text-[10px] text-gray-300">
                Offroute &middot; {new Date().getFullYear()}
              </p>
            </div>
          )}
        </div>
        </>
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
