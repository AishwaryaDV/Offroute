"use client";

import {
  ArrowLeft,
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
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker } from "@/components/MapDynamic";
import { getSharedCircuit } from "@/lib/circuits";
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

export default function SharedCircuitPage() {
  const { token } = useParams<{ token: string }>();

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
      })),
    [circuit?.points],
  );

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: circuit?.title ?? "Circuit",
          text: circuit?.description ?? "Check out this circuit on Offroute",
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b1120]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  if (error || !circuit) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b1120] px-6">
        <p className="text-lg font-semibold text-white">Circuit not found</p>
        <p className="text-sm text-zinc-400">
          This link may have expired or been removed.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Go to Offroute
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      {/* Map */}
      <div className="relative">
        <MapDynamic
          className="h-72 w-full"
          markers={mapMarkers}
          drawRoute
          interactive
        />
        <div className="absolute left-4 top-[max(env(safe-area-inset-top),0.75rem)]">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
            aria-label="Home"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
        </div>
      </div>

      {/* Circuit info */}
      <div className="px-5 pb-4 pt-5">
        <h1 className="text-2xl font-bold text-white">{circuit.title}</h1>
        {circuit.owner_name && (
          <p className="mt-1 text-sm text-zinc-400">
            by {circuit.owner_name}
          </p>
        )}
        {circuit.description && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {circuit.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
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
        <button
          onClick={handleShare}
          className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 active:bg-white/15"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>

      {/* Points list */}
      <div className="flex-1 border-t border-white/10 px-5 pb-10 pt-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
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
                className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/30">
                      {i + 1}
                    </span>
                    <p className="truncate text-sm font-semibold text-white">
                      {point.title}
                    </p>
                  </div>
                  {point.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {point.notes}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500">
                    {point.rating && <span>{"★".repeat(point.rating)}</span>}
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
      <div className="border-t border-white/10 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <Link
          href="/login"
          className="block rounded-xl bg-blue-500 py-3.5 text-center text-sm font-semibold text-white active:bg-blue-600"
        >
          Create your own circuits on Offroute
        </Link>
      </div>
    </div>
  );
}
