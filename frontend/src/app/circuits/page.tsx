"use client";

import { Copy, FolderOpen, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import MapDynamic from "@/components/MapDynamic";
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

function CircuitCard({ circuit, index, tripName }: { circuit: Circuit; index: number; tripName?: string }) {
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
      <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
        {isActive && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }} />
            Active
          </span>
        )}
        {tripName && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            {tripName}
          </span>
        )}
      </div>
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

  const tripMap = useMemo(() => {
    const map = new Map<string, string>();
    if (trips) {
      for (const t of trips as Trip[]) {
        map.set(t.id, t.title);
      }
    }
    return map;
  }, [trips]);

  const allCircuits = circuits ?? [];

  return (
    <div className="relative h-[100dvh]">
      {/* Background map — same as dashboard peek */}
      <div className="pointer-events-none absolute inset-0">
        <MapDynamic center={[78.9629, 20.5937]} zoom={3.6} />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      </div>

      {showTrips ? (
        <div className="sheet-up sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-y-auto rounded-t-[28px] bg-[#f5f6f8]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <button
              onClick={() => setShowTrips(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white active:bg-gray-100"
              aria-label="Back"
            >
              <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
            </button>
            <div className="w-11" />
          </div>

          <h1 className="px-5 pb-2 pt-2 text-4xl font-bold tracking-tight text-[#0f1d32]">
            Trips
          </h1>
          <p className="px-5 pb-6 text-sm text-gray-400">
            Group your circuits into trips for easy organization
          </p>

          <div className="flex gap-2 px-5 pb-5">
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
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#0f1d32] text-white disabled:opacity-40"
            >
              <Plus size={20} />
            </button>
          </div>

          {!trips || trips.length === 0 ? (
            <div className="px-5 pt-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <FolderOpen size={28} className="text-gray-300" />
              </div>
              <p className="mt-4 text-base font-semibold text-[#0f1d32]">No trips yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Create a trip to group your circuits
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-5">
              {trips.map((trip: Trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f6f8]">
                      <FolderOpen size={18} className="text-[#0f1d32]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f1d32]">
                        {trip.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {trip.circuit_count}{" "}
                        {trip.circuit_count === 1 ? "circuit" : "circuits"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTripMutation.mutate(trip.id)}
                    disabled={deleteTripMutation.isPending}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 active:bg-[#f5f6f8] disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            className="sheet-up sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-y-auto rounded-t-[28px] bg-[#f5f6f8]"
            style={{ paddingBottom: "calc(80px + max(0.75rem, env(safe-area-inset-bottom)))" }}
          >
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
              ) : allCircuits.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {allCircuits.map((circuit, i) => (
                    <CircuitCard
                      key={circuit.id}
                      circuit={circuit}
                      index={i}
                      tripName={circuit.trip_id ? tripMap.get(circuit.trip_id) : undefined}
                    />
                  ))}
                </div>
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
        </>
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
