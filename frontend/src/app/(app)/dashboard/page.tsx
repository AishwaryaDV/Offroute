"use client";

import {
  BarChart3,
  Calendar,
  Camera,
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
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { getMe, updateMe } from "@/lib/me";
import { useUnsplashCover } from "@/hooks/useUnsplashCover";
import { getCircuits, createCircuit } from "@/lib/circuits";
import { getMyStats } from "@/lib/stats";
import { getMyInvites, acceptInvite, declineInvite } from "@/lib/collaborators";
import { getAllPoints } from "@/lib/points";
import { countUniqueCountries } from "@/lib/countries";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import type { Invite } from "@/types/api";

interface NewCircuitValues {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  visibility: string;
}

type SheetSnap = "collapsed" | "half" | "full";

const FALLBACK_GRADIENT = "linear-gradient(135deg, #0f1d32 0%, #1a3a5c 100%)";

function formatMonthYear(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function DashboardCircuitCard({ circuit, isActive }: { circuit: import("@/types/api").Circuit; isActive: boolean }) {
  const unsplashCover = useUnsplashCover(circuit.title, !!circuit.cover_url);
  const coverUrl = circuit.cover_url ?? unsplashCover;

  return (
    <Link
      href={`/circuits/${circuit.slug ?? circuit.id}`}
      className="relative aspect-[4/3] overflow-hidden rounded-2xl active:opacity-90"
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: FALLBACK_GRADIENT }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
        {isActive && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }} />
            Active
          </span>
        )}
        {circuit.cloned_from_token && (
          <span className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm shadow-sm">
            <Copy size={8} />
            Cloned
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
  const { data: allPoints } = useQuery({
    queryKey: ["allPoints"],
    queryFn: getAllPoints,
  });
  const { data: countryCount = 0 } = useQuery({
    queryKey: ["countryCount", allPoints?.length],
    queryFn: () => countUniqueCountries(allPoints!),
    enabled: !!allPoints && allPoints.length > 0,
  });

  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(512 / img.width, 512 / img.height, 1);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = URL.createObjectURL(file);
      });
      const updated = await updateMe({ avatar_url: dataUrl });
      queryClient.setQueryData(["me"], updated);
      setAvatarFailed(false);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Could not update photo");
    }
  }, [queryClient]);

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


  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NewCircuitValues>({
    defaultValues: { visibility: "private" },
  });


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
      router.push(`/circuits/${circuit.slug ?? circuit.id}`);
    },
    onError: () => toast.error("Could not create circuit — try again"),
  });

  const visibleCircuits =
    snap === "full" ? circuits : circuits?.slice(0, 3);

  function isActiveTrip(circuit: { start_date: string | null; end_date: string | null }) {
    if (!circuit.start_date) return false;
    const now = new Date();
    const start = new Date(circuit.start_date);
    if (start > now) return false;
    if (!circuit.end_date) return true;
    return new Date(circuit.end_date) >= now;
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      {/* Transparent over the layout's PersistentMapBackground: the satellite
          map + loading overlay now live there so they survive navigation. */}
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

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarPick}
        />
        {me ? (
          <div className="flex items-center gap-4 px-6 pt-2 pb-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative h-14 w-14 shrink-0 rounded-full"
            >
              {me.avatar_url && !avatarFailed ? (
                <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-[#0f1d32]/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={me.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0f1d32] text-xl font-bold text-white">
                  {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0f1d32] ring-2 ring-white">
                <Camera size={10} className="text-white" />
              </div>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-xl font-bold text-[#0f1d32]">
                  {me.display_name ?? "Traveler"}
                </p>
                {me.nationality && COUNTRY_CODES[me.nationality] && (
                  <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/flags/${COUNTRY_CODES[me.nationality]}.svg`}
                      alt={me.nationality}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="truncate text-sm text-gray-500">
                {me.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-6 pt-2 pb-2 animate-pulse">
            <div className="h-14 w-14 shrink-0 rounded-full bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-32 rounded-md bg-gray-200" />
              <div className="h-3.5 w-48 rounded-md bg-gray-100" />
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
            { icon: <Globe2 size={14} />, value: countryCount, label: "Countries" },
            { icon: <Copy size={14} />, value: stats?.total_clones ?? 0, label: "Clones" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[#f5f6f8] px-2 py-3">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[#0f1d32]/60">{s.icon}</span>
                <p className="text-lg font-bold text-[#0f1d32]">{s.value}</p>
              </div>
              <p className="mt-0.5 text-center text-[11px] text-gray-400">{s.label}</p>
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
            onClick={() => toast("Coming soon", { description: "Travel stats are on the way" })}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-300 active:bg-gray-50"
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
              {visibleCircuits?.map((circuit) => (
                <DashboardCircuitCard
                  key={circuit.id}
                  circuit={circuit}
                  isActive={isActiveTrip(circuit)}
                />
              ))}
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

        <p className="px-6 pb-4 pt-10 text-center text-[10px] text-gray-300">
          Offroute &middot; {new Date().getFullYear()}
        </p>
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
          <div className="flex max-h-[94dvh] w-full flex-col rounded-t-3xl bg-white">
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
              className="flex flex-1 flex-col overflow-y-auto"
            >
            <div className="flex flex-col gap-5 px-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0f1d32]">
                  <Compass size={16} className="text-gray-400" />
                  <span>Circuit name</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Goa weekend"
                  autoComplete="off"
                  autoFocus
                  {...register("title", {
                    required: "Give your circuit a name",
                    maxLength: { value: 200, message: "200 characters max" },
                  })}
                  className={`w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
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
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0f1d32]">
                  <MapPin size={16} className="text-gray-400" />
                  <span>Description</span>
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </div>
                <input
                  type="text"
                  placeholder="A short summary of your trip"
                  {...register("description", {
                    maxLength: { value: 200, message: "200 characters max" },
                  })}
                  className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
                />
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
            </div>

              <div className="shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating…" : "Create circuit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
      <Dashboard />
  );
}
