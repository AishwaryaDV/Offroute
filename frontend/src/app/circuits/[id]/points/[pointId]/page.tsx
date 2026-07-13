"use client";

import {
  ArrowLeft,
  Calendar,
  Camera,
  Gem,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  Star,
  Trash2,
  Utensils,
  Wine,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { getPoint, deletePoint } from "@/lib/points";
import { getMedia } from "@/lib/media";

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

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  drink: "Drink",
  stay: "Stay",
  viewpoint: "Viewpoint",
  activity: "Activity",
  nature: "Nature",
  culture: "Culture",
  hidden_gem: "Hidden gem",
  other: "Other",
};

function PointDetail() {
  const { id: circuitId, pointId } = useParams<{
    id: string;
    pointId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: point, isLoading } = useQuery({
    queryKey: ["point", pointId],
    queryFn: () => getPoint(pointId),
  });

  const { data: media } = useQuery({
    queryKey: ["media", pointId],
    queryFn: () => getMedia(pointId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePoint(pointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", circuitId] });
      queryClient.invalidateQueries({ queryKey: ["circuit", circuitId] });
      toast.success("Point deleted");
      router.replace(`/circuits/${circuitId}`);
    },
    onError: () => toast.error("Could not delete point"),
  });

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0b1120]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  if (!point) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-[#0b1120] px-6">
        <p className="text-lg font-semibold text-white">Point not found</p>
        <Link
          href={`/circuits/${circuitId}`}
          className="mt-4 text-sm text-blue-400"
        >
          Back to circuit
        </Link>
      </div>
    );
  }

  const cat = point.category ?? "other";
  const Icon = CATEGORY_ICONS[cat] ?? MapPin;
  const color = CATEGORY_COLORS[cat] ?? "#3b82f6";
  const label = CATEGORY_LABELS[cat] ?? "Other";

  const marker = [
    { id: point.id, lng: point.longitude, lat: point.latitude, category: point.category ?? undefined },
  ];

  const visitedDate = point.visited_at
    ? new Date(point.visited_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const photoCount = media?.length ?? 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      {/* Map */}
      <div className="relative">
        <MapDynamic
          className="h-52 w-full"
          markers={marker}
          center={[point.longitude, point.latitude]}
          zoom={14}
        />

        <div className="absolute left-4 top-[max(env(safe-area-inset-top),0.75rem)]">
          <Link
            href={`/circuits/${circuitId}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
        </div>

        {/* Coordinates pill */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <MapPin size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-300">
            {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-5 pb-10 pt-5">
        {/* Title + category */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${color}20` }}
          >
            <Icon size={22} style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">{point.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm" style={{ color }}>
                {label}
              </span>
              {point.rating && (
                <span className="flex items-center gap-0.5 text-sm text-amber-400">
                  <Star size={13} fill="currentColor" />
                  {point.rating}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date */}
        {visitedDate && (
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
            <Calendar size={15} />
            {visitedDate}
          </div>
        )}

        {/* Notes */}
        {point.notes && (
          <div className="mt-4 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {point.notes}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="my-5 h-px bg-white/[0.08]" />

        {/* Photo section */}
        <div>
          {photoCount > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {media!.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08]"
                >
                  <div className="flex h-full items-center justify-center">
                    <Camera size={20} className="text-zinc-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                toast("Photos will be available once storage is configured", {
                  icon: "📸",
                })
              }
              className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-white/[0.12] p-4 text-left transition-colors active:border-blue-500/40 active:bg-blue-500/5"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                <Camera size={24} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-400">
                  Add photos and videos
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Up to 20 per point
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-white/[0.08]" />

        {/* Delete */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3.5 text-sm font-medium text-red-400 ring-1 ring-red-500/20 active:bg-red-500/20"
        >
          <Trash2 size={16} />
          Delete point
        </button>
      </main>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div className="w-full max-w-sm rounded-t-3xl bg-[#1a2435] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />
            <p className="text-center text-lg font-semibold text-white">
              Delete this point?
            </p>
            <p className="mt-2 text-center text-sm text-zinc-400">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl bg-white/[0.08] py-3.5 text-base font-medium text-white active:bg-white/[0.12]"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-red-500/90 py-3.5 text-base font-medium text-white active:bg-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PointDetailPage() {
  return (
    <AuthGuard>
      <PointDetail />
    </AuthGuard>
  );
}
