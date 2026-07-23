"use client";

import {
  ArrowLeft,
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
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import type { MapMarker } from "@/components/MapDynamic";
import { getSharedCircuit, cloneCircuit } from "@/lib/circuits";
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
  const router = useRouter();

  const cloneMutation = useMutation({
    mutationFn: () => cloneCircuit(token),
    onSuccess: (cloned) => {
      toast.success("Circuit cloned to your account");
      router.push(`/circuits/${cloned.id}`);
    },
    onError: (err: Error) =>
      toast.error(
        err.message?.includes("400")
          ? "You can't clone your own circuit"
          : "Could not clone — are you logged in?"
      ),
  });

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f5f6f8]">
        <StepLoader variant="light" />
      </div>
    );
  }

  if (error || !circuit) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f5f6f8] px-6">
        <p className="text-lg font-semibold text-[#0f1d32]">Circuit not found</p>
        <p className="text-sm text-gray-500">
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

      {/* White sheet */}
      <div className="relative -mt-6 flex-1 rounded-t-[28px] bg-white">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Circuit info */}
        <div className="px-5 pb-4 pt-4">
          <h1 className="text-2xl font-bold text-[#0f1d32]">{circuit.title}</h1>
          {circuit.owner_name && (
            <p className="mt-1 text-sm text-gray-500">
              by {circuit.owner_name}
            </p>
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
            <button
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
              className="flex items-center gap-2 rounded-full bg-[#0f1d32] px-4 py-2 text-sm font-medium text-white active:bg-[#162a46] disabled:opacity-50"
            >
              <Copy size={14} />
              {cloneMutation.isPending ? "Cloning…" : "Clone to my circuits"}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-full bg-[#f5f6f8] px-4 py-2 text-sm font-medium text-[#0f1d32] ring-1 ring-gray-200 active:bg-gray-100"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>

        {/* Points list */}
        <div className="border-t border-gray-100 px-5 pb-10 pt-4">
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
                  className="flex items-start gap-3 rounded-2xl bg-[#f5f6f8] p-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
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
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
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
        <div className="border-t border-gray-100 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <Link
            href="/login"
            className="block rounded-xl bg-blue-500 py-3.5 text-center text-sm font-semibold text-white active:bg-blue-600"
          >
            Create your own circuits on Offroute
          </Link>
        </div>
      </div>
    </div>
  );
}
