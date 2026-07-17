"use client";

import { Copy, FolderOpen, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { getCircuits } from "@/lib/circuits";
import { getMe } from "@/lib/me";
import { getTrips, createTrip, deleteTrip } from "@/lib/trips";
import type { Circuit, Trip } from "@/types/api";

const PLACEHOLDER_COVERS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop",
];

function formatMonthYear(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function CircuitCard({ circuit, index }: { circuit: Circuit; index: number }) {
  const coverUrl = PLACEHOLDER_COVERS[index % PLACEHOLDER_COVERS.length];
  const isActive = (() => {
    if (!circuit.start_date) return false;
    const now = new Date();
    const start = new Date(circuit.start_date);
    if (start > now) return false;
    if (!circuit.end_date) return true;
    return new Date(circuit.end_date) >= now;
  })();

  return (
    <Link
      href={`/circuits/${circuit.id}`}
      className="relative aspect-[4/3] overflow-hidden rounded-2xl active:opacity-90"
    >
      <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      {isActive && (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
          Active
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="truncate text-sm font-bold text-white">{circuit.title}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/70">
          <span className="flex items-center gap-0.5">
            <MapPin size={10} /> {circuit.point_count}
          </span>
          <span className="flex items-center gap-0.5">
            <Star size={10} /> {circuit.star_count}
          </span>
          <span className="flex items-center gap-0.5">
            <Copy size={10} /> {circuit.clone_count}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-white/50">
          {formatMonthYear(circuit.start_date ?? circuit.created_at)}
        </p>
      </div>
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

  let cardIndex = 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="sheet-up sheet-light flex-1 overflow-y-auto rounded-t-[28px] bg-[#f5f6f8]" style={{ paddingBottom: "calc(80px + max(0.75rem, env(safe-area-inset-bottom)))" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <header className="px-5 pb-4 pt-2">
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
              Circuits
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTrips(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white active:bg-gray-100"
                aria-label="Manage trips"
              >
                <FolderOpen size={20} className="text-[#0f1d32]" />
              </button>
              <button
                onClick={() => router.back()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white active:bg-gray-100"
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
              <p className="text-sm text-gray-500">
                {me.display_name ?? "You"} ·{" "}
                {circuits
                  ? `${circuits.length} ${circuits.length === 1 ? "circuit" : "circuits"}`
                  : "…"}
              </p>
            </div>
          )}
        </header>

        <main className="px-5 pb-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200" />
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
                    <div key={trip.id} className="mb-5">
                      <div className="mb-3 flex items-center gap-2">
                        <FolderOpen size={14} className="text-gray-400" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {trip.title}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {tripCircuits.map((circuit) => {
                          const idx = cardIndex++;
                          return <CircuitCard key={circuit.id} circuit={circuit} index={idx} />;
                        })}
                      </div>
                    </div>
                  );
                })}

              {/* Ungrouped circuits */}
              {untripped.length > 0 && tripped.size > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Ungrouped
                  </p>
                </div>
              )}
              {untripped.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {untripped.map((circuit) => {
                    const idx = cardIndex++;
                    return <CircuitCard key={circuit.id} circuit={circuit} index={idx} />;
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center px-5 pt-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <MapPin size={28} className="text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
                No circuits yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Tap New circuit on the home screen to start
              </p>
            </div>
          )}
        </main>
      </div>

      <BottomNav />

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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-[#0f1d32]">Trips</h2>
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
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
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
