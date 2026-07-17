"use client";

import {
  BarChart3,
  Calendar,
  Check,
  Compass,
  Copy,
  Eye,
  Globe2,
  Lock,
  MapPin,
  Plus,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import MapDynamic from "@/components/MapDynamic";
import { getMe } from "@/lib/me";
import { getCircuits, createCircuit } from "@/lib/circuits";
import { getMyStats } from "@/lib/stats";
import { getMyInvites, acceptInvite, declineInvite } from "@/lib/collaborators";
import type { Invite } from "@/types/api";

interface NewCircuitValues {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  visibility: string;
}

type SheetSnap = "collapsed" | "half" | "full";

function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: circuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: getCircuits,
  });
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getMyStats,
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

  // Draggable sheet state
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartSnap = useRef<SheetSnap>("half");
  const sheetRef = useRef<HTMLDivElement>(null);

  const SNAP_HEIGHTS: Record<SheetSnap, string> = {
    collapsed: "80px",
    half: "42dvh",
    full: "85dvh",
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      dragStartY.current = e.touches[0].clientY;
      dragStartSnap.current = snap;
      isDragging.current = false;
      setDragOffset(0);
    },
    [snap]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - dragStartY.current;
    isDragging.current = true;
    setDragOffset(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) {
      setDragOffset(null);
      return;
    }
    if (dragOffset === null) return;
    const threshold = 50;
    if (dragOffset > threshold) {
      if (dragStartSnap.current === "full") setSnap("half");
      else setSnap("collapsed");
    } else if (dragOffset < -threshold) {
      if (dragStartSnap.current === "collapsed") setSnap("half");
      else setSnap("full");
    }
    isDragging.current = false;
    setDragOffset(null);
  }, [dragOffset]);

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

  const visibleCircuits =
    snap === "full" ? circuits : circuits?.slice(0, 3);

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

  function isActiveTrip(circuit: { start_date: string | null; end_date: string | null }) {
    if (!circuit.start_date) return false;
    const now = new Date();
    const start = new Date(circuit.start_date);
    if (start > now) return false;
    if (!circuit.end_date) return true;
    return new Date(circuit.end_date) >= now;
  }

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

      {/* Loading overlay — fully opaque so no tile pop-in shows */}
      <div
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0b1120] transition-opacity duration-700 ${
          mapReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Compass size={36} strokeWidth={1.6} className="mb-4 animate-spin text-white/80" style={{ animationDuration: "3s" }} />
        <p className="text-sm text-white/50">Loading your map…</p>
      </div>

      {/* Header: Offroute branding */}
      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center gap-2 [filter:drop-shadow(0_1px_4px_rgba(0,0,0,.7))]">
          <Compass size={22} className="text-white" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Offroute
          </h1>
        </div>
      </header>

      {/* Draggable bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.35)]"
        style={{
          height: SNAP_HEIGHTS[snap],
          transform:
            dragOffset !== null ? `translateY(${Math.max(0, dragOffset)}px)` : undefined,
          transition: dragOffset !== null ? "none" : "height 0.35s cubic-bezier(.4,0,.2,1)",
          paddingBottom: "calc(80px + max(0.75rem, env(safe-area-inset-bottom)))",
        }}
      >
        {/* Drag zone — handle + profile header, touch-action:none so browser doesn't steal gesture */}
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

        {me && (
          <div className="flex items-center gap-4 px-6 pt-2 pb-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0f1d32]/10 text-xl font-bold text-[#0f1d32]">
              {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-[#0f1d32]">
                {me.display_name ?? "Traveler"}
              </p>
              <p className="truncate text-sm text-gray-500">
                {me.nationality ?? me.email}
              </p>
            </div>
          </div>
        )}
        </div>

        <div className={`flex-1 ${snap === "collapsed" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {/* Stats grid — icon + value inline, label below */}
        <div className="mt-4 grid grid-cols-4 gap-2 px-6">
          {[
            { icon: <Compass size={14} />, value: stats?.circuits ?? circuits?.length ?? 0, label: "Circuits" },
            { icon: <MapPin size={14} />, value: stats?.points ?? 0, label: "Points" },
            { icon: <Star size={14} />, value: stats?.stars_received ?? 0, label: "Stars" },
            { icon: <Copy size={14} />, value: stats?.total_clones ?? 0, label: "Clones" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[#f5f6f8] px-2 py-3">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[#0f1d32]/40">{s.icon}</span>
                <p className="text-lg font-bold text-[#0f1d32]">{s.value}</p>
              </div>
              <p className="mt-0.5 text-center text-[10px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA row: New circuit + Travel stats */}
        <div className="flex gap-3 px-6 pt-5">
          <button
            onClick={() => setShowNewCircuit(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0f1d32] py-3.5 text-sm font-semibold text-white active:bg-[#162a46]"
          >
            <Plus size={18} strokeWidth={2.5} />
            New circuit
          </button>
          <button
            disabled
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-300"
          >
            <BarChart3 size={18} />
            Travel stats
          </button>
        </div>

        {(!circuits || circuits.length === 0) && (
          <p className="mt-4 px-6 text-center text-sm text-gray-500">
            Kick things off by logging your first circuit.
          </p>
        )}

        {/* Circuit cards — 2-column grid */}
        {circuits && circuits.length > 0 && (
          <div className="px-6 pt-5">
            <div className="grid grid-cols-2 gap-3">
              {visibleCircuits?.map((circuit, i) => {
                const active = isActiveTrip(circuit);
                const coverUrl = PLACEHOLDER_COVERS[i % PLACEHOLDER_COVERS.length];
                return (
                  <Link
                    key={circuit.id}
                    href={`/circuits/${circuit.id}`}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl active:opacity-90"
                  >
                    <img
                      src={coverUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                    {active && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
                        Active
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="truncate text-sm font-bold text-white">
                        {circuit.title}
                      </p>
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
              })}
            </div>

            {/* Show more / Show less */}
            {circuits.length > 3 && (
              <button
                onClick={() => setSnap(snap === "full" ? "half" : "full")}
                className="mt-3 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-blue-500 active:bg-blue-50"
              >
                {snap === "full"
                  ? "Show less"
                  : `Show all ${circuits.length} circuits`}
              </button>
            )}
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
      </div>

      <BottomNav />

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
          <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between px-5 pb-1 pt-2">
              <button
                onClick={() => {
                  setShowNewCircuit(false);
                  reset();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-[#0f1d32]">New Circuit</h2>
              <div className="w-9" />
            </div>
            <p className="px-5 pb-5 text-center text-xs text-gray-400">
              Don&apos;t worry, you can change all of this later
            </p>

            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              className="flex flex-col gap-5 px-5"
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
                  className={`w-full rounded-xl bg-white px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                    errors.title
                      ? "ring-red-400 focus:ring-red-500"
                      : "ring-gray-200 focus:ring-[#0f1d32]"
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
                  className="w-full resize-none rounded-xl bg-white px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {descValue.length}/200
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#0f1d32]">
                  <Calendar size={16} className="text-gray-400" />
                  <span>Trip dates</span>
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-400">
                      Start date
                    </label>
                    <input
                      type="date"
                      {...register("start_date")}
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-400">
                      End date
                    </label>
                    <input
                      type="date"
                      {...register("end_date")}
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#0f1d32]">
                  <Eye size={16} className="text-gray-400" />
                  <span>Who can see this?</span>
                </div>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      { value: "private", label: "Only me", desc: "Only you can see this circuit", icon: <Lock size={18} /> },
                      { value: "shared", label: "Friends", desc: "People you share with can see it", icon: <Users size={18} /> },
                      { value: "public", label: "Everyone", desc: "Anyone can discover this circuit", icon: <Globe2 size={18} /> },
                    ] as const
                  ).map((opt) => {
                    const selected = watch("visibility") === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors ${
                          selected
                            ? "bg-[#0f1d32]/5 ring-[#0f1d32]"
                            : "bg-white ring-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          {...register("visibility")}
                          className="sr-only"
                        />
                        <span className={selected ? "text-[#0f1d32]" : "text-gray-400"}>{opt.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${selected ? "text-[#0f1d32]" : "text-gray-600"}`}>{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.desc}</p>
                        </div>
                        <div className={`h-4 w-4 rounded-full ring-1 ${selected ? "bg-[#0f1d32] ring-[#0f1d32]" : "ring-gray-300"}`}>
                          {selected && (
                            <Check size={12} className="m-0.5 text-white" />
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#f5f6f8] px-4 py-3">
                <UserPlus size={18} className="shrink-0 text-gray-400" />
                <p className="text-xs text-gray-400">
                  You can invite collaborators after creating your circuit
                </p>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
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
