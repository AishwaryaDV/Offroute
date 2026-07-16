"use client";

import {
  Gem,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  Timer,
  Utensils,
  Wine,
  X,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getAllPoints } from "@/lib/points";
import type { WorldPoint } from "@/types/api";

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

function Activity() {
  const router = useRouter();

  const { data: points, isLoading } = useQuery({
    queryKey: ["world-points"],
    queryFn: getAllPoints,
  });

  const groupedByDate = useMemo(() => {
    const sorted = [...(points ?? [])].sort((a, b) => {
      if (!a.visited_at && !b.visited_at) return 0;
      if (!a.visited_at) return 1;
      if (!b.visited_at) return -1;
      return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime();
    });

    const groups: { label: string; points: WorldPoint[] }[] = [];
    let currentLabel = "";

    for (const p of sorted) {
      const label = p.visited_at
        ? new Date(p.visited_at).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Undated";

      if (label !== currentLabel) {
        groups.push({ label, points: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].points.push(p);
    }

    return groups;
  }, [points]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="flex-1 overflow-y-auto rounded-t-[28px] bg-white">
        <header className="flex items-start justify-between px-5 pt-5">
          <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
            Activity
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
            aria-label="Close"
          >
            <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
          </button>
        </header>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#0f1d32]" />
          </div>
        )}

        {!isLoading && groupedByDate.length === 0 && (
          <div className="px-5 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
              <Timer size={28} className="text-gray-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
              No points yet
            </p>
            <p className="mt-1 text-base text-gray-500">
              Add points to your circuits to build your timeline.
            </p>
          </div>
        )}

        {groupedByDate.length > 0 && (
          <div className="px-5 pb-28 pt-5">
            {groupedByDate.map((group) => (
              <div key={group.label} className="mb-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {group.label}
                </p>
                <div className="relative border-l-2 border-gray-200 pl-5">
                  {group.points.map((point) => {
                    const Icon = CATEGORY_ICONS[point.category ?? "other"] ?? MapPin;
                    const color = CATEGORY_COLORS[point.category ?? "other"] ?? "#3b82f6";
                    return (
                      <Link
                        key={point.id}
                        href={`/circuits/${point.circuit_id}/points/${point.id}`}
                        className="relative -ml-[1.625rem] mb-3 flex gap-3 rounded-2xl bg-[#f5f6f8] p-4 active:bg-gray-100"
                      >
                        <div
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon size={16} className="shrink-0" style={{ color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0f1d32]">
                            {point.title}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {point.circuit_title}
                            {point.category && ` · ${point.category.replace("_", " ")}`}
                          </p>
                          {point.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {point.notes}
                            </p>
                          )}
                        </div>
                        {point.rating && (
                          <div className="shrink-0 self-start text-xs text-amber-500">
                            {"★".repeat(point.rating)}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AuthGuard>
      <Activity />
    </AuthGuard>
  );
}
