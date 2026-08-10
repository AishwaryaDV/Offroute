"use client";

import {
  Check,
  Compass,
  Copy,
  Gem,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  Share2,
  Utensils,
  Wine,
  Zap,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import type { MapMarker } from "@/components/MapDynamic";
import { getSharedCircuit, cloneCircuit } from "@/lib/circuits";
import { supabase } from "@/lib/supabase";
import type { SharedPoint } from "@/types/api";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}>;

const CATEGORY_ICONS: Record<string, IconComponent> = {
  food: Utensils,
  drink: Wine,
  stay: Home,
  viewpoint: Mountain,
  activity: Zap,
  nature: Leaf,
  culture: Landmark,
  hidden_gem: Gem,
  other: MapPin,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#ef4444",
  drink: "#f59e0b",
  stay: "#8b5cf6",
  viewpoint: "#10b981",
  activity: "#f97316",
  nature: "#22c55e",
  culture: "#6366f1",
  hidden_gem: "#ec4899",
  other: "#3b82f6",
};

function SharedCircuitPageInner() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const searchParams = useSearchParams();
  const [clonedSlug, setClonedSlug] = useState<string | null>(null);
  const autoCloned = useRef(false);

  async function handleClone() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/s/${token}?clone=1`)}`);
      return;
    }
    cloneMutation.mutate();
  }

  const cloneMutation = useMutation({
    mutationFn: () => cloneCircuit(token),
    onSuccess: (cloned) => {
      const slug = cloned.slug ?? cloned.id;
      setClonedSlug(slug);
      if (searchParams.get("clone") === "1") {
        toast.success("Circuit cloned!");
        router.replace(`/circuits/${slug}`);
      }
    },
    onError: (err: Error) =>
      toast.error(
        err.message?.includes("400")
          ? "You can't clone your own circuit"
          : "Could not clone"
      ),
  });

  useEffect(() => {
    if (searchParams.get("clone") === "1" && !autoCloned.current) {
      autoCloned.current = true;
      cloneMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: circuit, isLoading, error } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => getSharedCircuit(token),
  });

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      (circuit?.points ?? []).map((p: SharedPoint, i: number) => ({
        id: p.id,
        lng: p.longitude,
        lat: p.latitude,
        label: String(i + 1),
        category: p.category ?? undefined,
        photoUrl: p.photo_url ?? undefined,
      })),
    [circuit?.points],
  );

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: circuit?.title ?? "Circuit",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f5f6f8]">
        <StepLoader variant="light" />
      </div>
    );
  }

  if (error || !circuit) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f5f6f8] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f1d32]/10">
          <Compass size={28} className="text-[#0f1d32]/40" />
        </div>
        <p className="text-lg font-bold text-[#0f1d32]">
          Looks like this trail went cold
        </p>
        <p className="max-w-[260px] text-sm leading-relaxed text-gray-500">
          This circuit may have been removed or the link has expired. Time to chart a new course!
        </p>
        <Link
          href="/dashboard"
          className="mt-2 rounded-full bg-[#0f1d32] px-6 py-2.5 text-sm font-semibold text-white active:bg-[#162a46]"
        >
          Back to Offroute
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0b1120]">
      {/* Map */}
      <div className="relative">
        <MapDynamic
          className="h-72 w-full"
          markers={mapMarkers}
          drawRoute
          interactive
        />
        <div className="absolute left-4 top-[max(env(safe-area-inset-top),0.75rem)]">
          <Link href="/" className="flex items-center gap-2">
            <Compass size={22} className="text-white/80" />
            <span className="text-xl font-bold tracking-tight text-white/90">Offroute</span>
          </Link>
        </div>
      </div>

      {/* White sheet */}
      <div className="relative -mt-6 flex-1 rounded-t-[28px] bg-white">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Circuit info */}
        <div className="px-5 pb-4 pt-4">
          <h1 className="text-2xl font-bold text-[#0f1d32]">{circuit.title}</h1>
          {circuit.owner_name && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f1d32]/10">
                <Compass size={14} className="text-[#0f1d32]/50" />
              </div>
              <span className="text-sm font-semibold text-[#0f1d32]/70">
                {circuit.owner_name}
              </span>
            </div>
          )}
          {circuit.description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {circuit.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span>{circuit.point_count} points</span>
            {circuit.start_date && (
              <span>
                {new Date(circuit.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            {clonedSlug ? (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600 ring-1 ring-emerald-200">
                <Check size={14} />
                Cloned
              </div>
            ) : (
              <button
                onClick={handleClone}
                disabled={cloneMutation.isPending}
                className="flex items-center gap-2 rounded-full bg-[#0f1d32] px-4 py-2 text-sm font-medium text-white active:bg-[#162a46] disabled:opacity-50"
              >
                <Copy size={14} />
                {cloneMutation.isPending ? "Cloning…" : "Clone"}
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-full bg-[#f5f6f8] px-4 py-2 text-sm font-medium text-[#0f1d32] ring-1 ring-gray-200 active:bg-gray-100"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
          {clonedSlug && (
            <p className="mt-2 text-xs text-gray-400">
              Find it in your circuits on the dashboard
            </p>
          )}
        </div>

        {/* Points list */}
        <div className="border-t border-gray-100 px-5 pb-4 pt-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Points
          </h2>
          <div className="flex flex-col gap-3">
            {circuit.points.map((point: SharedPoint, i: number) => {
              const cat = point.category ?? "other";
              const Icon = CATEGORY_ICONS[cat] ?? MapPin;
              const color = CATEGORY_COLORS[cat] ?? "#3b82f6";

              return (
                <div
                  key={point.id}
                  className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  {point.photo_url ? (
                    <img
                      src={point.photo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}15` }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300">
                        {i + 1}
                      </span>
                      <p className="truncate text-sm font-semibold text-[#0f1d32]">
                        {point.title}
                      </p>
                    </div>
                    {point.notes && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {point.notes}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      {point.rating && (
                        <span className="text-amber-500">
                          {"★".repeat(point.rating)}
                        </span>
                      )}
                      {point.visited_at && (
                        <span>
                          {new Date(point.visited_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#0f1d32] px-6 py-3 text-sm font-semibold text-white active:bg-[#162a46]"
          >
            Create your own on Offroute
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SharedCircuitPage() {
  return (
    <Suspense>
      <SharedCircuitPageInner />
    </Suspense>
  );
}
