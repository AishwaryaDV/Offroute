"use client";

import { ArrowLeft, MapPin, Plus, Share2, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker } from "@/components/MapDynamic";
import { getCircuit, deleteCircuit } from "@/lib/circuits";
import { getPoints, deletePoint } from "@/lib/points";
import type { Point } from "@/types/api";

function CircuitDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

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
      })),
    [points]
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

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: circuit?.title ?? "Circuit",
          text: circuit?.description ?? "Check out this circuit on Offroute",
          url,
        });
      } catch {
        // user cancelled
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
          drawRoute
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

      {/* Top bar overlay */}
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
        </div>

        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
          aria-label="Share"
        >
          <Share2 size={18} className="text-white" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={`absolute inset-x-0 bottom-0 z-10 transition-[max-height] duration-300 ease-out ${
          sheetExpanded ? "max-h-[70dvh]" : "max-h-[40dvh]"
        }`}
      >
        <div className="pointer-events-none h-16 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="overflow-y-auto rounded-t-3xl bg-[#111a2e]/95 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Drag handle */}
          <button
            className="flex w-full items-center justify-center py-3"
            onClick={() => setSheetExpanded(!sheetExpanded)}
            aria-label={sheetExpanded ? "Collapse" : "Expand"}
          >
            <div className="h-1 w-10 rounded-full bg-zinc-600" />
          </button>

          {/* Circuit title & description */}
          <div className="px-5 pb-3">
            <h1 className="text-xl font-bold text-white">
              {circuit?.title ?? "..."}
            </h1>
            {circuit?.description && (
              <p className="mt-1 text-sm text-zinc-400">{circuit.description}</p>
            )}
          </div>

          {/* Points list */}
          <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {points && points.length > 0 ? (
              <div className="space-y-2">
                {points.map((point: Point, i: number) => (
                  <div
                    key={point.id}
                    className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{point.title}</p>
                      {point.notes && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">
                          {point.notes}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {point.category && (
                          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 capitalize ring-1 ring-white/[0.08]">
                            {point.category.replace("_", " ")}
                          </span>
                        )}
                        {point.rating && (
                          <span className="text-amber-400">
                            {"★".repeat(point.rating)}
                          </span>
                        )}
                        {point.visited_at && <span>{point.visited_at}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(point.id)}
                      className="shrink-0 p-2 text-zinc-600 active:text-red-400"
                      aria-label="Delete point"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/[0.04] p-8 text-center ring-1 ring-white/[0.06]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <MapPin size={22} className="text-blue-400" />
                </div>
                <p className="text-base font-medium text-zinc-300">
                  Add your first stop
                </p>
                <p className="mt-1 text-sm text-zinc-500">Tap + to drop a pin</p>
              </div>
            )}

            <button
              onClick={() => setShowDeleteConfirm("circuit")}
              className="mt-8 w-full rounded-xl py-4 text-base font-semibold text-red-400 ring-1 ring-white/[0.08] active:bg-white/[0.04]"
            >
              Delete circuit
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link
        href={`/circuits/${id}/points/new`}
        className="fixed bottom-[max(calc(env(safe-area-inset-bottom)+10.5rem),12rem)] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 active:bg-blue-600"
        aria-label="Add point"
      >
        <Plus size={26} className="text-white" />
      </Link>

      {/* Delete confirmation bottom sheet */}
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
