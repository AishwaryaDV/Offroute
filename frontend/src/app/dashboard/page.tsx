"use client";

import {
  Compass,
  List,
  MapPin,
  Plus,
  Settings,
  Timer,
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
  const { data: circuits } = useQuery({
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
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
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

      {/* Loading overlay — translucent + blurred so tile pop-in never shows,
          spinning compass, fades out only once every tile has rendered */}
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center bg-[#0b1120]/35 backdrop-blur-lg transition-opacity duration-700 ${
          mapReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Compass
          size={64}
          strokeWidth={1.6}
          className="animate-spin text-white [animation-duration:2.5s]"
        />
      </div>

      {/* Header: Offroute branding + settings gear */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center gap-2">
          <Compass size={22} className="text-white/80" />
          <h1 className="text-xl font-bold tracking-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">
            offroute
          </h1>
        </div>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md active:bg-black/50"
          aria-label="Settings"
        >
          <Settings size={18} className="text-white/80" />
        </Link>
      </header>

      {/* Me overlay — profile info */}
      {me && (
        <div className="absolute inset-x-0 top-20 z-10 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white backdrop-blur-md [text-shadow:0_1px_4px_rgba(0,0,0,.4)]">
            {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
          </div>
          <p className="mt-2 text-base font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.5)]">
            {me.display_name ?? "Traveler"}
            {me.nationality && (
              <span className="ml-2 font-normal text-white/60">
                {me.nationality}
              </span>
            )}
          </p>
          <p className="text-sm text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">
            {me.email}
          </p>
        </div>
      )}

      {/* Bottom section */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        {/* Circuit cards (empty state lives on the circuits page) */}
        <div className="px-5 pb-3">
          {circuits && circuits.length > 0 && (
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circuits.map((circuit) => (
                <Link
                  key={circuit.id}
                  href={`/circuits/${circuit.id}`}
                  className="min-w-[220px] shrink-0 rounded-2xl bg-black/30 p-4 ring-1 ring-white/[0.1] backdrop-blur-md active:bg-black/40"
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
          )}
        </div>

        {/* Floating bottom nav */}
        <div className="px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <nav className="flex items-center justify-around rounded-full bg-[#f5f0e8]/75 px-3 py-2.5 shadow-lg backdrop-blur-xl">
            <button className="flex flex-col items-center gap-1 px-3 py-1 text-[#0f1d32]">
              <Compass size={26} strokeWidth={2.2} />
              <span className="text-xs font-semibold">Me</span>
            </button>

            <Link
              href="/circuits"
              className="flex flex-col items-center gap-1 px-3 py-1 text-[#0f1d32]/50"
            >
              <List size={26} strokeWidth={2.2} />
              <span className="text-xs font-semibold">Circuits</span>
            </Link>

            <button
              onClick={() => setShowNewCircuit(true)}
              className="flex flex-col items-center gap-1 px-3 py-1 text-[#0f1d32]/50 active:text-[#0f1d32]"
            >
              <Plus size={26} strokeWidth={2.2} />
              <span className="text-xs font-semibold">Add</span>
            </button>

            <Link
              href="/activity"
              className="flex flex-col items-center gap-1 px-3 py-1 text-[#0f1d32]/50"
            >
              <Timer size={26} strokeWidth={2.2} />
              <span className="text-xs font-semibold">Activity</span>
            </Link>
          </nav>
        </div>
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
            <div className="flex justify-center pb-1 pt-3">
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
