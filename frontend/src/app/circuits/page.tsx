"use client";

import { FolderOpen, MapPin, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { getCircuits } from "@/lib/circuits";
import { getMe } from "@/lib/me";
import { getTrips, createTrip, deleteTrip } from "@/lib/trips";
import type { Circuit, Trip } from "@/types/api";

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

function CircuitRow({ circuit }: { circuit: Circuit }) {
  return (
    <Link
      href={`/circuits/${circuit.id}`}
      className="block px-5 py-5 active:bg-gray-50"
    >
      <p className="text-2xl font-bold text-[#0f1d32]">{circuit.title}</p>
      <div className="mt-1.5 flex items-center gap-1.5 text-base text-gray-500">
        <span>
          {circuit.point_count} {circuit.point_count === 1 ? "point" : "points"}
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
  );
}

function CircuitsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });
  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: getTrips,
  });

  const [showTrips, setShowTrips] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");

  const createTripMutation = useMutation({
    mutationFn: () => createTrip(newTripTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setNewTripTitle("");
      toast.success("Trip created");
    },
    onError: () => toast.error("Could not create trip"),
  });

  const deleteTripMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Trip deleted");
    },
    onError: () => toast.error("Could not delete trip"),
  });

  const { tripped, untripped } = useMemo(() => {
    if (!circuits) return { tripped: new Map<string, Circuit[]>(), untripped: [] as Circuit[] };
    const tripped = new Map<string, Circuit[]>();
    const untripped: Circuit[] = [];
    for (const c of circuits) {
      if (c.trip_id) {
        if (!tripped.has(c.trip_id)) tripped.set(c.trip_id, []);
        tripped.get(c.trip_id)!.push(c);
      } else {
        untripped.push(c);
      }
    }
    return { tripped, untripped };
  }, [circuits]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-white">
        <header className="sticky top-0 z-10 rounded-t-[28px] bg-white px-5 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
              Circuits
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTrips(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
                aria-label="Manage trips"
              >
                <FolderOpen size={20} className="text-[#0f1d32]" />
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
                aria-label="Close"
              >
                <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
              </button>
            </div>
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
            <>
              {/* Trips with their circuits */}
              {trips &&
                trips.map((trip: Trip) => {
                  const tripCircuits = tripped.get(trip.id) ?? [];
                  if (tripCircuits.length === 0) return null;
                  return (
                    <div key={trip.id}>
                      <div className="flex items-center gap-2 bg-[#f5f6f8] px-5 py-3">
                        <FolderOpen size={16} className="text-gray-400" />
                        <p className="text-sm font-semibold text-gray-500">
                          {trip.title}
                        </p>
                        <span className="text-xs text-gray-400">
                          {tripCircuits.length}
                        </span>
                      </div>
                      {tripCircuits.map((circuit, i) => (
                        <div key={circuit.id}>
                          {i > 0 && <div className="mx-5 h-px bg-gray-100" />}
                          <CircuitRow circuit={circuit} />
                        </div>
                      ))}
                    </div>
                  );
                })}

              {/* Ungrouped circuits */}
              {untripped.length > 0 && tripped.size > 0 && (
                <div className="flex items-center gap-2 bg-[#f5f6f8] px-5 py-3">
                  <p className="text-sm font-semibold text-gray-500">
                    Ungrouped
                  </p>
                  <span className="text-xs text-gray-400">
                    {untripped.length}
                  </span>
                </div>
              )}
              {untripped.map((circuit, i) => (
                <div key={circuit.id}>
                  {i > 0 && <div className="h-2 bg-[#f5f6f8]" />}
                  <CircuitRow circuit={circuit} />
                </div>
              ))}
            </>
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

      {/* Manage trips sheet */}
      {showTrips && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTrips(false);
          }}
        >
          <div className="max-h-[70dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <button
                onClick={() => setShowTrips(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Trips</h2>
              <div className="w-9" />
            </div>

            {/* Create trip */}
            <div className="flex gap-2 px-5 pb-4">
              <input
                type="text"
                placeholder="New trip name"
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTripTitle.trim()) createTripMutation.mutate();
                }}
                className="flex-1 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (newTripTitle.trim()) createTripMutation.mutate();
                }}
                disabled={!newTripTitle.trim() || createTripMutation.isPending}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-[#0f1d32] text-white disabled:opacity-40"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Trip list */}
            {!trips || trips.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FolderOpen size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Create a trip to group your circuits
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-5">
                {trips.map((trip: Trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-2xl bg-[#f5f6f8] p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0f1d32]">
                        {trip.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {trip.circuit_count}{" "}
                        {trip.circuit_count === 1 ? "circuit" : "circuits"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTripMutation.mutate(trip.id)}
                      disabled={deleteTripMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-200 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
