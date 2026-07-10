"use client";

import { ArrowLeft, MapPin, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-zinc-50/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md dark:bg-black/80">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-zinc-600 dark:text-zinc-400" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-black dark:text-white">
            {circuit?.title ?? "…"}
          </h1>
          {circuit?.description && (
            <p className="truncate text-sm text-zinc-500">{circuit.description}</p>
          )}
        </div>
      </header>

      {mapMarkers.length > 0 && (
        <MapDynamic
          className="h-56 w-full shrink-0"
          markers={mapMarkers}
          drawRoute
          key={mapMarkers.length}
        />
      )}

      <main className="flex-1 px-5 pb-24 pt-4">
        {points && points.length > 0 ? (
          <div className="space-y-2">
            {points.map((point: Point, i: number) => (
              <div
                key={point.id}
                className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-black dark:text-white">{point.title}</p>
                  {point.notes && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
                      {point.notes}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {point.category && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                        {point.category.replace("_", " ")}
                      </span>
                    )}
                    {point.rating && <span>{"★".repeat(point.rating)}</span>}
                    {point.visited_at && <span>{point.visited_at}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(point.id)}
                  className="shrink-0 p-2 text-zinc-300 active:text-red-500 dark:text-zinc-600"
                  aria-label="Delete point"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center dark:bg-zinc-900">
            <MapPin size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="text-base text-zinc-500">
              No points yet — tap + to add your first stop.
            </p>
          </div>
        )}

        <button
          onClick={() => setShowDeleteConfirm("circuit")}
          className="mt-8 w-full rounded-xl py-4 text-base font-semibold text-red-600 ring-1 ring-zinc-200 active:bg-red-50 dark:ring-zinc-800 dark:active:bg-zinc-900"
        >
          Delete circuit
        </button>
      </main>

      <Link
        href={`/circuits/${id}/points/new`}
        className="fixed bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-black shadow-lg active:bg-zinc-800 dark:bg-white dark:active:bg-zinc-200"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        aria-label="Add point"
      >
        <Plus size={26} className="text-white dark:text-black" />
      </Link>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <p className="text-center font-semibold text-black dark:text-white">
              {showDeleteConfirm === "circuit"
                ? "Delete this circuit and all its points?"
                : "Delete this point?"}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-xl py-3 text-base font-medium ring-1 ring-zinc-200 active:bg-zinc-50 dark:ring-zinc-700 dark:active:bg-zinc-800"
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
                  deleteCircuitMutation.isPending || deletePointMutation.isPending
                }
                className="flex-1 rounded-xl bg-red-600 py-3 text-base font-medium text-white active:bg-red-700 disabled:opacity-50"
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
