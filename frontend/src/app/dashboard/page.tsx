"use client";

import { Compass, MapPin, Plus, Settings, X } from "lucide-react";
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
  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(
    null
  );

  // Get user location passively (no fly-to, just the dot)
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
    formState: { errors },
  } = useForm<NewCircuitValues>();

  const createMutation = useMutation({
    mutationFn: (data: NewCircuitValues) =>
      createCircuit({
        title: data.title,
        description: data.description || undefined,
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
        zoom={3.5}
        interactive
        userLocation={userLoc ?? undefined}
      />

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
        {/* Gradient fade */}
        <div className="pointer-events-none h-32 bg-gradient-to-t from-[#0b1120]/90 to-transparent" />

        {/* Circuit cards or empty state */}
        <div className="bg-[#0b1120]/80 px-5 pb-2 pt-1 backdrop-blur-lg">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/[0.08]" />
          ) : circuits && circuits.length > 0 ? (
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circuits.map((circuit) => (
                <Link
                  key={circuit.id}
                  href={`/circuits/${circuit.id}`}
                  className="min-w-[220px] shrink-0 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/[0.12] active:bg-white/[0.14]"
                >
                  <p className="font-semibold text-white">{circuit.title}</p>
                  {circuit.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-white/60">
                      {circuit.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
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
            <div className="rounded-2xl bg-white/[0.08] px-6 py-6 text-center ring-1 ring-white/[0.1]">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                <MapPin size={20} className="text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white">No circuits yet</p>
              <p className="mt-0.5 text-xs text-white/50">
                Tap + to start your first one
              </p>
            </div>
          )}
        </div>

        {/* Floating bottom nav bar */}
        <div className="px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <nav className="flex items-center justify-around rounded-2xl bg-[#0b1120]/80 px-6 py-2.5 ring-1 ring-white/[0.1] backdrop-blur-xl">
            <button className="flex flex-col items-center gap-1 text-blue-400">
              <Compass size={22} />
              <span className="text-[10px] font-medium">Map</span>
            </button>

            <button
              onClick={() => setShowNewCircuit(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/30 active:bg-blue-600"
            >
              <Plus size={24} className="text-white" />
            </button>

            <Link
              href="/settings"
              className="flex flex-col items-center gap-1 text-zinc-500"
            >
              <Settings size={22} />
              <span className="text-[10px] font-medium">Settings</span>
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
          <div className="w-full rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 pt-2">
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

            {/* Form */}
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
                  className={`w-full rounded-xl bg-gray-50 px-4 py-4 text-base text-gray-900 placeholder-gray-400 outline-none ring-1 ${
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

              <textarea
                placeholder="Description (optional)"
                rows={3}
                {...register("description")}
                className="w-full resize-none rounded-xl bg-gray-50 px-4 py-4 text-base text-gray-900 placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="mt-2 rounded-xl bg-blue-500 py-4 text-base font-semibold text-white active:bg-blue-600 disabled:opacity-50"
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
