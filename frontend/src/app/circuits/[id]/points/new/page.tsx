"use client";

import { ArrowLeft, Crosshair, MapPin, Navigation, Settings, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { createPoint } from "@/lib/points";
import type { PointCategory } from "@/types/api";

const LOCATION_SEEN_KEY = "offroute-location-seen";

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
  const [showGuidance, setShowGuidance] = useState(false);
  const [showDenied, setShowDenied] = useState(false);

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

  const requestLocation = useCallback(() => {
    localStorage.setItem(LOCATION_SEEN_KEY, "1");
    setShowGuidance(false);
    setShowDenied(false);
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocatingGps(false);
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setShowDenied(true);
        } else {
          toast.error("Could not get your location — try again");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  function handleGpsClick() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    const seen = localStorage.getItem(LOCATION_SEEN_KEY);
    if (!seen) {
      setShowGuidance(true);
      return;
    }
    requestLocation();
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
            onClick={handleGpsClick}
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

      {/* Location guidance bottom sheet — first time only */}
      {showGuidance && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGuidance(false)}
        >
          <div
            className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-[#111a2e] px-6 pb-10 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGuidance(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
              aria-label="Close"
            >
              <X size={16} className="text-zinc-400" />
            </button>

            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
                <Navigation size={28} className="text-blue-400" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-white">
              Pin your exact spot
            </h2>
            <p className="mb-8 text-center text-sm leading-relaxed text-zinc-400">
              Offroute uses your location to place points precisely on your
              circuit map. We only check when you tap &ldquo;Use GPS&rdquo;
              &mdash; never in the background.
            </p>

            <button
              type="button"
              onClick={requestLocation}
              className="w-full rounded-xl bg-blue-500 py-4 text-base font-semibold text-white active:bg-blue-600"
            >
              Allow Location
            </button>
            <button
              type="button"
              onClick={() => setShowGuidance(false)}
              className="mt-3 w-full py-2 text-center text-sm text-zinc-500 active:text-zinc-400"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Permission denied sheet — shown when browser blocked location */}
      {showDenied && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDenied(false)}
        >
          <div
            className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-[#111a2e] px-6 pb-10 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDenied(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
              aria-label="Close"
            >
              <X size={16} className="text-zinc-400" />
            </button>

            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                <Settings size={28} className="text-amber-400" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-white">
              Location blocked
            </h2>
            <p className="mb-3 text-center text-sm leading-relaxed text-zinc-400">
              Your browser blocked location access. To use GPS, enable it in
              your device settings:
            </p>

            <div className="mb-8 rounded-xl bg-white/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                How to enable
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>
                  <span className="font-medium text-white">iOS Safari:</span>{" "}
                  Settings &rarr; Safari &rarr; Location &rarr; Allow
                </li>
                <li>
                  <span className="font-medium text-white">Android Chrome:</span>{" "}
                  Tap the lock icon in the address bar &rarr; Permissions &rarr;
                  Location &rarr; Allow
                </li>
                <li>
                  <span className="font-medium text-white">Desktop:</span>{" "}
                  Click the lock icon next to the URL &rarr; Location &rarr;
                  Allow
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="w-full rounded-xl bg-blue-500 py-4 text-base font-semibold text-white active:bg-blue-600"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setShowDenied(false)}
              className="mt-3 w-full py-2 text-center text-sm text-zinc-500 active:text-zinc-400"
            >
              Use map instead
            </button>
          </div>
        </div>
      )}
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
