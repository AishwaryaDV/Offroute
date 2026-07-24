"use client";

import { ArrowLeft, Calendar, Crosshair, FileText, MapPin, Navigation, Search, Settings, Star, Tag, Type, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { createPoint } from "@/lib/points";
import type { PointCategory } from "@/types/api";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { "User-Agent": "Offroute/1.0" } },
        );
        if (res.ok) setSearchResults(await res.json());
      } catch {
        /* network error — silently skip */
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ mode: "onBlur" });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (!location) throw new Error("No location set");
      return createPoint(circuitId, {
        title: data.title.trim(),
        notes: data.notes?.trim() || undefined,
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
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLocatingGps(false);
        mapHandleRef.current?.flyTo(loc.lng, loc.lat, 15);
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

  const mapHandleRef = useRef<import("@/components/MapDynamic").MapHandle | null>(null);

  const mapMarkers = location
    ? [{ id: "new", lng: location.lng, lat: location.lat, draggable: true }]
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
          interactive
          onMapClick={(lngLat) => setLocation({ lat: lngLat.lat, lng: lngLat.lng })}
          onMarkerDragEnd={(_id, lngLat) => setLocation({ lat: lngLat.lat, lng: lngLat.lng })}
          onMapInit={(handle) => { mapHandleRef.current = handle; }}
        />
        {!location && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#111a2e]/80">
            <p className="text-sm text-gray-400">Tap the map, use GPS, or search below</p>
          </div>
        )}

        <div className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] z-10">
          <Link
            href={`/circuits/${circuitId}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg active:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-[#0f1d32]" />
          </Link>
        </div>
      </div>

      {/* White sheet content */}
      <div className="sheet-up sheet-light relative -mt-6 flex-1 rounded-t-[28px] bg-white pb-5">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <h2 className="px-5 pb-3 pt-2 text-2xl font-bold tracking-tight text-[#0f1d32]">
          New Point
        </h2>

        <main className="px-5">
          {/* GPS button + coordinates */}
          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={handleGpsClick}
              disabled={locatingGps}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0f1d32] py-3 text-sm font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
            >
              <Crosshair size={18} />
              {locatingGps ? "Locating…" : "Use GPS"}
            </button>
            {location && (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-600 ring-1 ring-emerald-200">
                  <MapPin size={14} />
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
                <span className="text-[10px] text-gray-400">Drag pin to adjust</span>
              </div>
            )}
          </div>

          {/* Place search */}
          <div className="relative mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for a place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-[#f5f6f8] py-3 pl-10 pr-4 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
              />
              {searching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#0f1d32]" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5">
                {searchResults.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => {
                      const loc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
                      setLocation(loc);
                      setSearchQuery("");
                      setSearchResults([]);
                      mapHandleRef.current?.flyTo(loc.lng, loc.lat, 15);
                    }}
                    className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left active:bg-[#f5f6f8]"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    <span className="line-clamp-2 text-sm text-gray-700">
                      {r.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-4"
          >
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Type size={14} />
                <span>Point name</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Colosseum"
                autoComplete="off"
                {...register("title", {
                  required: "Give this point a name",
                  minLength: { value: 2, message: "At least 2 characters" },
                  maxLength: { value: 200, message: "200 characters max" },
                  pattern: { value: /[a-zA-Z0-9]/, message: "Must contain at least one letter or number" },
                  validate: (v) => v.trim().length > 0 || "Name cannot be only spaces",
                })}
                className={`w-full rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                  errors.title
                    ? "ring-red-400 focus:ring-red-500"
                    : "ring-gray-200 focus:ring-[#0f1d32]"
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <FileText size={14} />
                <span>Notes</span>
              </div>
              <textarea
                placeholder="What made this place special?"
                rows={2}
                {...register("notes", {
                  maxLength: { value: 2000, message: "2000 characters max" },
                })}
                className={`w-full resize-none rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                  errors.notes
                    ? "ring-red-400 focus:ring-red-500"
                    : "ring-gray-200 focus:ring-[#0f1d32]"
                }`}
              />
              {errors.notes && (
                <p className="mt-1.5 text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Tag size={14} />
                <span>Category</span>
              </div>
              <select
                {...register("category")}
                className="w-full appearance-none rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Star size={14} />
                  <span>Rating</span>
                </div>
                <select
                  {...register("rating")}
                  className="w-full appearance-none rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Calendar size={14} />
                  <span>Date visited</span>
                </div>
                <input
                  type="date"
                  {...register("visited_at", {
                    validate: (v) => {
                      if (!v) return true;
                      return new Date(v) <= new Date() || "Date cannot be in the future";
                    },
                  })}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] outline-none ring-1 ${
                    errors.visited_at
                      ? "ring-red-400 focus:ring-red-500"
                      : "ring-gray-200 focus:ring-[#0f1d32]"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || !location}
              className="mt-2 rounded-full bg-[#0f1d32] py-3.5 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save point"}
            </button>
          </form>
        </main>
      </div>

      {/* Location guidance bottom sheet */}
      {showGuidance && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowGuidance(false)}
        >
          <div
            className="relative w-full max-w-lg animate-slide-up rounded-t-3xl bg-white px-6 pb-10 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGuidance(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8]"
              aria-label="Close"
            >
              <X size={16} className="text-gray-500" />
            </button>

            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f1d32]/10">
                <Navigation size={28} className="text-[#0f1d32]" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-[#0f1d32]">
              Pin your exact spot
            </h2>
            <p className="mb-8 text-center text-sm leading-relaxed text-gray-500">
              Offroute uses your location to place points precisely on your
              circuit map. We only check when you tap &ldquo;Use GPS&rdquo;
              &mdash; never in the background.
            </p>

            <button
              type="button"
              onClick={requestLocation}
              className="w-full rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46]"
            >
              Allow Location
            </button>
            <button
              type="button"
              onClick={() => setShowGuidance(false)}
              className="mt-3 w-full py-2 text-center text-sm text-gray-400 active:text-gray-600"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Permission denied sheet */}
      {showDenied && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDenied(false)}
        >
          <div
            className="relative w-full max-w-lg animate-slide-up rounded-t-3xl bg-white px-6 pb-10 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDenied(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8]"
              aria-label="Close"
            >
              <X size={16} className="text-gray-500" />
            </button>

            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <Settings size={28} className="text-amber-500" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-[#0f1d32]">
              Location blocked
            </h2>
            <p className="mb-3 text-center text-sm leading-relaxed text-gray-500">
              Your browser blocked location access. To use GPS, enable it in
              your device settings:
            </p>

            <div className="mb-8 rounded-xl bg-[#f5f6f8] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                How to enable
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <span className="font-medium text-[#0f1d32]">iOS Safari:</span>{" "}
                  Settings &rarr; Safari &rarr; Location &rarr; Allow
                </li>
                <li>
                  <span className="font-medium text-[#0f1d32]">Android Chrome:</span>{" "}
                  Tap the lock icon in the address bar &rarr; Permissions &rarr;
                  Location &rarr; Allow
                </li>
                <li>
                  <span className="font-medium text-[#0f1d32]">Desktop:</span>{" "}
                  Click the lock icon next to the URL &rarr; Location &rarr;
                  Allow
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="w-full rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setShowDenied(false)}
              className="mt-3 w-full py-2 text-center text-sm text-gray-400 active:text-gray-600"
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
