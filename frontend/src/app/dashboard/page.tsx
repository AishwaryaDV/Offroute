"use client";

import {
  Check,
  Compass,
  List,
  MapPin,
  Plus,
  Settings,
  Tag,
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
import { TagInput } from "@/components/TagInput";
import { getMe } from "@/lib/me";
import { getCircuits, createCircuit } from "@/lib/circuits";
import { getMyInvites, acceptInvite, declineInvite } from "@/lib/collaborators";
import type { Invite } from "@/types/api";

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
  const { data: invites } = useQuery({
    queryKey: ["invites"],
    queryFn: getMyInvites,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Invite accepted");
    },
    onError: () => toast.error("Could not accept invite"),
  });

  const declineMutation = useMutation({
    mutationFn: declineInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invite declined");
    },
    onError: () => toast.error("Could not decline invite"),
  });

  const [showNewCircuit, setShowNewCircuit] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(
    null
  );
  const [tags, setTags] = useState<string[]>([]);

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
        tags: tags.length > 0 ? tags : undefined,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
      }),
    onSuccess: (circuit) => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Circuit created");
      setShowNewCircuit(false);
      reset();
      setTags([]);
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

      {/* Me sheet — white, curved top, pulled up over the map (Polarsteps home) */}
      <div className="sheet-up sheet-light absolute inset-x-0 bottom-0 z-10 rounded-t-[28px] bg-white pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {me && (
          <div className="flex items-center gap-4 px-6 pt-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#0f1d32]/10 text-2xl font-bold text-[#0f1d32]">
              {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold text-[#0f1d32]">
                {me.display_name ?? "Traveler"}
              </p>
              <p className="truncate text-base text-gray-500">
                {me.nationality ?? me.email}
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="mt-5 flex px-6">
          <div className="flex-1 border-r border-gray-200">
            <p className="text-2xl font-bold text-[#0f1d32]">
              {circuits?.length ?? 0}
            </p>
            <p className="text-base text-gray-500">Circuits</p>
          </div>
          <div className="flex-1 pl-6">
            <p className="text-2xl font-bold text-[#0f1d32]">
              {circuits?.reduce((sum, c) => sum + c.point_count, 0) ?? 0}
            </p>
            <p className="text-base text-gray-500">Points</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pt-6">
          <button
            onClick={() => setShowNewCircuit(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46]"
          >
            <Plus size={20} strokeWidth={2.5} />
            New circuit
          </button>
          {(!circuits || circuits.length === 0) && (
            <p className="mt-4 text-center text-base text-gray-500">
              Kick things off by logging your first circuit.
            </p>
          )}
        </div>

        {/* Recent circuits strip */}
        {circuits && circuits.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-6 pt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {circuits.map((circuit) => (
              <Link
                key={circuit.id}
                href={`/circuits/${circuit.id}`}
                className="min-w-[200px] shrink-0 rounded-2xl bg-[#f5f6f8] p-4 active:bg-gray-100"
              >
                <p className="truncate font-semibold text-[#0f1d32]">
                  {circuit.title}
                </p>
                {circuit.tags && circuit.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {circuit.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#0f1d32]/10 px-2 py-0.5 text-[10px] font-medium text-[#0f1d32]/70"
                      >
                        {tag}
                      </span>
                    ))}
                    {circuit.tags.length > 3 && (
                      <span className="rounded-full bg-[#0f1d32]/10 px-2 py-0.5 text-[10px] font-medium text-[#0f1d32]/70">
                        +{circuit.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={13} />
                  <span>
                    {circuit.point_count}{" "}
                    {circuit.point_count === 1 ? "point" : "points"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {invites && invites.length > 0 && (
          <div className="px-6 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Invites
            </p>
            <div className="flex flex-col gap-2">
              {invites.map((inv: Invite) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-2xl bg-[#f5f6f8] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0f1d32]">
                      {inv.circuit_title}
                    </p>
                    <p className="text-xs text-gray-400">
                      from {inv.invited_by_name} · {inv.role}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => acceptMutation.mutate(inv.id)}
                      disabled={acceptMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white active:bg-emerald-600 disabled:opacity-50"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(inv.id)}
                      disabled={declineMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 active:bg-gray-300 disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating bottom nav — above the sheet */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav className="flex items-center justify-around rounded-full bg-[#f5f0e8]/90 px-3 py-2.5 shadow-lg backdrop-blur-xl">
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

      {/* New Circuit bottom sheet */}
      {showNewCircuit && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewCircuit(false);
              reset();
              setTags([]);
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
                  setTags([]);
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
                  <Tag size={16} />
                  <span>Tags</span>
                </div>
                <TagInput tags={tags} onChange={setTags} />
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
