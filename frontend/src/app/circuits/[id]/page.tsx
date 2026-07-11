"use client";

import { Fragment } from "react";
import {
  ArrowLeft,
  Gem,
  Home,
  Landmark,
  Leaf,
  MapPin,
  MoreVertical,
  Mountain,
  Plus,
  Share2,
  Trash2,
  Utensils,
  Wine,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker, MapHandle } from "@/components/MapDynamic";
import { getCircuit, deleteCircuit } from "@/lib/circuits";
import { getPoints, deletePoint } from "@/lib/points";
import type { Point } from "@/types/api";

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

function CircuitDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showMenu, setShowMenu] = useState(false);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);

  const { data: circuit } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id),
  });

  const { data: points } = useQuery({
    queryKey: ["points", id],
    queryFn: () => getPoints(id),
  });

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      (points ?? []).map((p: Point, i: number) => ({
        id: p.id,
        lng: p.longitude,
        lat: p.latitude,
        label: String(i + 1),
        category: p.category ?? undefined,
      })),
    [points],
  );

  const deleteCircuitMutation = useMutation({
    mutationFn: () => deleteCircuit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Circuit deleted");
      router.replace("/dashboard");
    },
    onError: () => toast.error("Could not delete circuit"),
  });

  const deletePointMutation = useMutation({
    mutationFn: deletePoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", id] });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      setShowDeleteConfirm(null);
      toast.success("Point deleted");
    },
    onError: () => toast.error("Could not delete point"),
  });

  function handleSelectPoint(point: Point) {
    setActivePointId(point.id);
    mapHandleRef.current?.flyTo(point.longitude, point.latitude, 14);
  }

  async function handleShare() {
    const url = window.location.href;
    setShowMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: circuit?.title ?? "Circuit",
          text: circuit?.description ?? "Check out this circuit on Offroute",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      {/* Full-screen map */}
      {mapMarkers.length > 0 ? (
        <MapDynamic
          className="absolute inset-0 h-full w-full"
          markers={mapMarkers}
          activeMarkerId={activePointId ?? undefined}
          drawRoute
          interactive
          onMarkerClick={(markerId) => {
            const pt = points?.find((p) => p.id === markerId);
            if (pt) handleSelectPoint(pt);
          }}
          onMapInit={(handle) => {
            mapHandleRef.current = handle;
          }}
          key={mapMarkers.length}
        />
      ) : (
        <MapDynamic
          className="absolute inset-0 h-full w-full"
          center={[78.9629, 20.5937]}
          zoom={4}
          interactive
        />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-white" />
        </Link>

        <div className="mx-3 min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
            {circuit?.title ?? ""}
          </p>
          {circuit?.description && (
            <p className="truncate text-xs text-white/60">
              {circuit.description}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
          aria-label="Menu"
        >
          <MoreVertical size={18} className="text-white" />
        </button>
      </div>

      {/* Actions menu dropdown */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-[calc(max(env(safe-area-inset-top),0.75rem)+3rem)] z-30 w-48 rounded-2xl bg-[#1a2435]/95 p-1.5 shadow-xl backdrop-blur-xl ring-1 ring-white/10">
            <button
              onClick={handleShare}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white active:bg-white/10"
            >
              <Share2 size={16} className="text-zinc-400" />
              Share circuit
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowDeleteConfirm("circuit");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 active:bg-white/10"
            >
              <Trash2 size={16} />
              Delete circuit
            </button>
          </div>
        </>
      )}

      {/* Bottom carousel */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="pointer-events-none h-24 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="bg-gradient-to-t from-black/30 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))]">
          {points && points.length > 0 ? (
            <div className="flex items-stretch gap-3 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {points.map((point: Point, i: number) => {
                const cat = point.category ?? "other";
                const Icon = CATEGORY_ICONS[cat] ?? MapPin;
                const color = CATEGORY_COLORS[cat] ?? "#3b82f6";
                const isActive = activePointId === point.id;

                return (
                  <Fragment key={point.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPoint(point)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSelectPoint(point);
                      }}
                      className={`min-w-[200px] shrink-0 rounded-2xl p-3.5 text-left backdrop-blur-xl transition-all ${
                        isActive
                          ? "bg-white/15 ring-2 ring-white/30 scale-[1.02]"
                          : "bg-white/10 ring-1 ring-white/10"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ background: `${color}20` }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/40">
                            {i + 1}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(point.id);
                            }}
                            className="p-1 text-zinc-600 active:text-red-400"
                            aria-label="Delete point"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="truncate text-base font-bold text-white">
                        {point.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                        {point.category && (
                          <span className="capitalize">
                            {point.category.replace("_", " ")}
                          </span>
                        )}
                        {point.rating && (
                          <span className="text-amber-400">
                            {"★".repeat(point.rating)}
                          </span>
                        )}
                      </div>
                      {point.notes && (
                        <p className="mt-1.5 line-clamp-1 text-sm text-zinc-500">
                          {point.notes}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/circuits/${id}/points/new`}
                      className="flex shrink-0 items-center"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-md active:bg-white/25">
                        <Plus size={18} className="text-white" />
                      </div>
                    </Link>
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="px-5">
              <div className="rounded-2xl bg-white/10 p-6 text-center ring-1 ring-white/10 backdrop-blur-xl">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25">
                  <Plus size={32} strokeWidth={2.5} className="text-white" />
                </div>
                <p className="text-lg font-bold text-white">
                  Add your first point
                </p>
                <p className="mx-auto mt-2 max-w-[240px] text-sm text-zinc-400">
                  Mark a location on the map and bring it to life with notes and
                  details.
                </p>
                <Link
                  href={`/circuits/${id}/points/new`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0f1d32] active:bg-zinc-200"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Add
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(null);
          }}
        >
          <div className="w-full max-w-sm rounded-t-3xl bg-[#1a2435] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />
            <p className="text-center text-lg font-semibold text-white">
              {showDeleteConfirm === "circuit"
                ? "Delete this circuit and all its points?"
                : "Delete this point?"}
            </p>
            <p className="mt-2 text-center text-sm text-zinc-400">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-xl bg-white/[0.08] py-3.5 text-base font-medium text-white active:bg-white/[0.12]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm === "circuit") {
                    deleteCircuitMutation.mutate();
                  } else {
                    deletePointMutation.mutate(showDeleteConfirm);
                  }
                }}
                disabled={
                  deleteCircuitMutation.isPending ||
                  deletePointMutation.isPending
                }
                className="flex-1 rounded-xl bg-red-500/90 py-3.5 text-base font-medium text-white active:bg-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CircuitDetailPage() {
  return (
    <AuthGuard>
      <CircuitDetail />
    </AuthGuard>
  );
}
