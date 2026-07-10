"use client";

import { ArrowLeft, Crosshair, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { createPoint } from "@/lib/points";
import type { PointCategory } from "@/types/api";

const CATEGORIES: { value: PointCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "drink", label: "Drink" },
  { value: "stay", label: "Stay" },
  { value: "viewpoint", label: "Viewpoint" },
  { value: "activity", label: "Activity" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "hidden_gem", label: "Hidden gem" },
  { value: "other", label: "Other" },
];

interface FormValues {
  title: string;
  notes: string;
  category: string;
  rating: string;
  visited_at: string;
}

function AddPoint() {
  const { id: circuitId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (!location) throw new Error("No location set");
      return createPoint(circuitId, {
        title: data.title,
        notes: data.notes || undefined,
        latitude: location.lat,
        longitude: location.lng,
        category: (data.category as PointCategory) || undefined,
        rating: data.rating ? Number(data.rating) : undefined,
        visited_at: data.visited_at || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", circuitId] });
      queryClient.invalidateQueries({ queryKey: ["circuit", circuitId] });
      toast.success("Point added");
      router.back();
    },
    onError: () => toast.error("Could not add point — try again"),
  });

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocatingGps(false);
      },
      () => {
        toast.error("Could not get your location — check permissions");
        setLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const mapMarkers = location
    ? [{ id: "new", lng: location.lng, lat: location.lat }]
    : [];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      {/* Map with back button overlay */}
      <div className="relative">
        <MapDynamic
          className="h-52 w-full"
          markers={mapMarkers}
          center={location ? [location.lng, location.lat] : undefined}
          zoom={location ? 15 : 12}
          onMapClick={(lngLat) => setLocation({ lat: lngLat.lat, lng: lngLat.lng })}
          key={location ? `${location.lat},${location.lng}` : "empty"}
        />
        {!location && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111a2e]/80">
            <p className="text-sm text-zinc-500">Tap the map or use GPS below</p>
          </div>
        )}

        <div className="absolute left-4 top-[max(env(safe-area-inset-top),0.75rem)]">
          <Link
            href={`/circuits/${circuitId}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
        </div>
      </div>

      <main className="flex-1 px-5 pb-10 pt-4">
        {/* GPS button + coordinates */}
        <div className="mb-5 flex gap-3">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locatingGps}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white active:bg-blue-600 disabled:opacity-50"
          >
            <Crosshair size={18} />
            {locatingGps ? "Locating…" : "Use GPS"}
          </button>
          {location && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 text-xs text-emerald-400 ring-1 ring-emerald-500/20">
              <MapPin size={14} />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <div>
            <input
              type="text"
              placeholder="Point name"
              autoComplete="off"
              {...register("title", {
                required: "Give this point a name",
                maxLength: { value: 200, message: "200 characters max" },
              })}
              className={`w-full rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white placeholder-zinc-500 outline-none ring-1 ${
                errors.title
                  ? "ring-red-500/60 focus:ring-red-500"
                  : "ring-white/[0.12] focus:ring-blue-500/60"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-400">{errors.title.message}</p>
            )}
          </div>

          <textarea
            placeholder="Notes (optional)"
            rows={2}
            {...register("notes")}
            className="w-full resize-none rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
          />

          <select
            {...register("category")}
            className="w-full appearance-none rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
          >
            <option value="" className="bg-[#1a2435]">Category (optional)</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#1a2435]">
                {c.label}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <select
              {...register("rating")}
              className="flex-1 appearance-none rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
            >
              <option value="" className="bg-[#1a2435]">Rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n} className="bg-[#1a2435]">
                  {"★".repeat(n)}
                </option>
              ))}
            </select>

            <input
              type="date"
              {...register("visited_at")}
              className="flex-1 rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || !location}
            className="mt-4 rounded-xl bg-blue-500 py-4 text-base font-semibold text-white active:bg-blue-600 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save point"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewPointPage() {
  return (
    <AuthGuard>
      <AddPoint />
    </AuthGuard>
  );
}
