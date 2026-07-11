"use client";

import {
  Compass,
  List,
  MapPin,
  Plus,
  Settings,
  X,
  Calendar,
  Eye,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { getMe } from "@/lib/me";
import { getCircuits, createCircuit } from "@/lib/circuits";

interface NewCircuitValues {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  visibility: string;
}

function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: circuits, isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });

  const [showNewCircuit, setShowNewCircuit] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(
    null
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLoc({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NewCircuitValues>({
    defaultValues: { visibility: "private" },
  });

  const descValue = watch("description") ?? "";

  const createMutation = useMutation({
    mutationFn: (data: NewCircuitValues) =>
      createCircuit({
        title: data.title,
        description: data.description || undefined,
        visibility:
          (data.visibility as "private" | "shared" | "public") || undefined,
      }),
    onSuccess: (circuit) => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Circuit created");
      setShowNewCircuit(false);
      reset();
      router.push(`/circuits/${circuit.id}`);
    },
    onError: () => toast.error("Could not create circuit — try again"),
  });

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      {/* Full-screen satellite map */}
      <MapDynamic
        className="absolute inset-0 h-full w-full"
        center={[78.9629, 20.5937]}
        zoom={3.6}
        interactive
        userLocation={userLoc ?? undefined}
        onReady={() => setMapReady(true)}
      />

      {/* Loading overlay — compass + spinner while tiles load */}
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b1120]/90">
          <div className="flex flex-col items-center gap-4">
            <Compass size={48} className="text-white/20" />
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        </div>
      )}

      {/* Header overlay */}
      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <p className="text-sm text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
          {me?.display_name ? `Hi, ${me.display_name}` : " "}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">
          My Circuits
        </h1>
      </header>

      {/* Bottom section: cards + nav */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="pointer-events-none h-28 bg-gradient-to-t from-[#0b1120] to-transparent" />

        {/* Circuit cards or empty state */}
        <div className="bg-[#0b1120] px-5 pb-2 pt-1">
          {isLoading ? (
            <div className="h-20 animate-pulse rounded-2xl bg-white/[0.08]" />
          ) : circuits && circuits.length > 0 ? (
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circuits.map((circuit) => (
                <Link
                  key={circuit.id}
                  href={`/circuits/${circuit.id}`}
                  className="min-w-[220px] shrink-0 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.1] active:bg-white/[0.1]"
                >
                  <p className="font-semibold text-white">{circuit.title}</p>
                  {circuit.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-white/50">
                      {circuit.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/35">
                    <MapPin size={12} />
                    <span>
                      {circuit.point_count}{" "}
                      {circuit.point_count === 1 ? "point" : "points"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.06] px-6 py-5 text-center ring-1 ring-white/[0.08]">
              <p className="text-sm font-medium text-white/70">
                No circuits yet
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                Tap + to start your first one
              </p>
            </div>
          )}
        </div>

        {/* Bottom nav bar */}
        <nav className="flex items-end justify-around bg-[#0b1120] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          <button className="flex flex-col items-center gap-0.5 py-1 text-white">
            <Compass size={22} />
            <span className="text-[10px] font-medium">Map</span>
          </button>

          <Link
            href="/circuits"
            className="flex flex-col items-center gap-0.5 py-1 text-white/40"
          >
            <List size={22} />
            <span className="text-[10px] font-medium">Circuits</span>
          </Link>

          <button
            onClick={() => setShowNewCircuit(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162033] ring-1 ring-white/[0.15] active:bg-[#1e2d45]"
          >
            <Plus size={22} className="text-white" />
          </button>

          <Link
            href="/settings"
            className="flex flex-col items-center gap-0.5 py-1 text-white/40"
          >
            <Settings size={22} />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </nav>
      </div>

      {/* New Circuit bottom sheet */}
      {showNewCircuit && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewCircuit(false);
              reset();
            }
          }}
        >
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <button
                onClick={() => {
                  setShowNewCircuit(false);
                  reset();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">New Circuit</h2>
              <div className="w-9" />
            </div>

            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              className="flex flex-col gap-4 px-5"
            >
              <div>
                <input
                  type="text"
                  placeholder="Name your circuit"
                  autoComplete="off"
                  autoFocus
                  {...register("title", {
                    required: "Give your circuit a name",
                    maxLength: { value: 200, message: "200 characters max" },
                  })}
                  className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 outline-none ring-1 ${
                    errors.title
                      ? "ring-red-400 focus:ring-red-500"
                      : "ring-gray-200 focus:ring-blue-500"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <textarea
                  placeholder="Description (optional)"
                  rows={2}
                  maxLength={200}
                  {...register("description", {
                    maxLength: { value: 200, message: "200 characters max" },
                  })}
                  className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {descValue.length}/200
                </p>
              </div>

              {/* Dates */}
              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar size={16} />
                  <span>Trip dates</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">
                      Start date
                    </label>
                    <input
                      type="date"
                      {...register("start_date")}
                      className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">
                      End date
                    </label>
                    <input
                      type="date"
                      {...register("end_date")}
                      className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Eye size={16} />
                  <span>Who can see this?</span>
                </div>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "private", label: "Only me" },
                      { value: "shared", label: "Friends" },
                      { value: "public", label: "Everyone" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium ring-1 transition-colors ${
                        watch("visibility") === opt.value
                          ? "bg-[#0f1d32] text-white ring-[#0f1d32]"
                          : "bg-white text-gray-600 ring-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("visibility")}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="mt-1 rounded-xl bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create circuit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
