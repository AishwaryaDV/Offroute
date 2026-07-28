"use client";

import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Gem,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  Pencil,
  Star,
  Trash2,
  Utensils,
  Wine,
  X,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { DatePicker } from "@/components/DatePicker";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import { getPoint, getPoints, deletePoint, updatePoint } from "@/lib/points";
import { getCircuit } from "@/lib/circuits";
import { getMedia, uploadPhoto, deleteMedia } from "@/lib/media";
import type { PointCategory } from "@/types/api";

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


const CATEGORIES: { value: PointCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "drink", label: "Drink" },
  { value: "stay", label: "Stay" },
  { value: "viewpoint", label: "Viewpoint" },
  { value: "activity", label: "Activity" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "hidden_gem", label: "Hidden gem" },
  { value: "other", label: "Other" },
];

interface EditValues {
  title: string;
  notes: string;
  category: string;
  rating: string;
  visited_at: string;
}

function PointDetail() {
  const { id: circuitId, pointId } = useParams<{
    id: string;
    pointId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; id: string } | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: point, isLoading } = useQuery({
    queryKey: ["point", pointId],
    queryFn: () => getPoint(pointId),
  });

  const { data: circuit } = useQuery({
    queryKey: ["circuit", circuitId],
    queryFn: () => getCircuit(circuitId),
  });

  const { data: points } = useQuery({
    queryKey: ["points", circuitId],
    queryFn: () => getPoints(circuitId),
  });

  const { data: media } = useQuery({
    queryKey: ["media", pointId],
    queryFn: () => getMedia(pointId),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditValues>();

  const watchedRating = watch("rating");
  const watchedCategory = watch("category");

  const editMutation = useMutation({
    mutationFn: (data: EditValues) =>
      updatePoint(pointId, {
        title: data.title,
        notes: data.notes || undefined,
        category: (data.category as PointCategory) || undefined,
        rating: data.rating ? Number(data.rating) : undefined,
        visited_at: data.visited_at || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      queryClient.invalidateQueries({ queryKey: ["points", circuitId] });
      toast.success("Point updated");
      setEditing(false);
    },
    onError: () => toast.error("Could not update point"),
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

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", pointId] });
      toast.success("Photo removed");
    },
    onError: () => toast.error("Could not remove photo"),
  });

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadPhoto(pointId, file);
      }
      queryClient.invalidateQueries({ queryKey: ["media", pointId] });
      toast.success(files.length === 1 ? "Photo uploaded" : `${files.length} photos uploaded`);
    } catch {
      toast.error("Upload failed — try again");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function startEditing() {
    if (!point) return;
    reset({
      title: point.title,
      notes: point.notes ?? "",
      category: point.category ?? "",
      rating: point.rating ? String(point.rating) : "",
      visited_at: point.visited_at?.split("T")[0] ?? "",
    });
    setEditing(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#0b1120]">
        <div className="h-72 bg-[#111a2e]" />
        <div className="flex flex-1 items-center justify-center rounded-t-[28px] bg-white -mt-4">
          <StepLoader variant="light" />
        </div>
      </div>
    );
  }

  if (!point) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#0b1120]">
        <div className="h-72 bg-[#111a2e]" />
        <div className="flex flex-1 flex-col items-center justify-center rounded-t-[28px] bg-white -mt-4 px-6">
          <p className="text-lg font-semibold text-[#0f1d32]">Point not found</p>
          <Link
            href={`/circuits/${circuitId}`}
            className="mt-4 text-sm font-medium text-blue-500"
          >
            Back to circuit
          </Link>
        </div>
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
  const pointOrder = points?.findIndex((p) => p.id === pointId) ?? -1;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      {/* Map */}
      <div className="relative">
        <MapDynamic
          className="h-72 w-full"
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
        <div className="absolute bottom-10 left-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <MapPin size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-300">
            {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
          </span>
        </div>
      </div>

      {/* White sheet content */}
      <div className="relative -mt-6 flex-1 rounded-t-[28px] bg-white pb-10">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-4">
          {editing ? (
            /* ---- Edit mode ---- */
            <form
              onSubmit={handleSubmit((data) => editMutation.mutate(data))}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0f1d32]">Edit point</h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Point name"
                  autoComplete="off"
                  {...register("title", {
                    required: "Give this point a name",
                    maxLength: { value: 200, message: "200 characters max" },
                  })}
                  className={`w-full rounded-xl bg-[#f5f6f8] px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                    errors.title
                      ? "ring-red-400 focus:ring-red-500"
                      : "ring-gray-200 focus:ring-blue-500"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <textarea
                placeholder="Notes (optional)"
                rows={3}
                {...register("notes")}
                className="w-full resize-none rounded-xl bg-[#f5f6f8] px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
              />

              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">Category</p>
                <input type="hidden" {...register("category")} />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setValue("category", watchedCategory === c.value ? "" : c.value)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        watchedCategory === c.value
                          ? "bg-[#0f1d32] text-white"
                          : "bg-[#f5f6f8] text-[#0f1d32] ring-1 ring-gray-200"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">Rating</p>
                <div className="flex gap-1">
                  <input type="hidden" {...register("rating")} />
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue("rating", watchedRating === String(n) ? "" : String(n))}
                      className="p-1"
                    >
                      <Star
                        size={28}
                        className={Number(watchedRating) >= n ? "text-amber-400" : "text-gray-300"}
                        fill={Number(watchedRating) >= n ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">Date visited</p>
                <input type="hidden" {...register("visited_at")} />
                <DatePicker
                  value={watch("visited_at") || ""}
                  onChange={(v) => setValue("visited_at", v)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <button
                type="submit"
                disabled={editMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-base font-semibold text-white active:bg-blue-600 disabled:opacity-50"
              >
                <Check size={18} />
                {editMutation.isPending ? "Saving…" : "Save changes"}
              </button>
            </form>
          ) : (
            /* ---- View mode ---- */
            <>
              {/* Title + category + actions */}
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${color}15` }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-[#0f1d32]">{point.title}</h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color }}>
                      {label}
                    </span>
                    {point.rating && (
                      <span className="flex items-center gap-0.5 text-sm text-amber-500">
                        <Star size={13} fill="currentColor" />
                        {point.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={startEditing}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
                    aria-label="Edit point"
                  >
                    <Pencil size={15} className="text-[#0f1d32]" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-red-50"
                    aria-label="Delete point"
                  >
                    <Trash2 size={15} className="text-[#0f1d32]" />
                  </button>
                </div>
              </div>

              {/* Circuit + order */}
              {circuit && (
                <Link
                  href={`/circuits/${circuitId}`}
                  className="mt-3 flex items-center gap-2 text-sm text-gray-500 active:text-blue-500"
                >
                  <MapPin size={13} />
                  <span>
                    {pointOrder >= 0 && (
                      <span className="font-semibold text-gray-700">
                        #{pointOrder + 1}
                      </span>
                    )}
                    {" in "}
                    <span className="text-gray-700">{circuit.title}</span>
                  </span>
                </Link>
              )}

              {/* Date */}
              {visitedDate && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  {visitedDate}
                </div>
              )}

              {/* Notes */}
              {point.notes && (
                <div className="mt-4 rounded-2xl bg-[#f5f6f8] p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Icon size={14} style={{ color }} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#0f1d32]/50">
                      {label}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#0f1d32]">
                    {point.notes}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="my-5 h-px bg-gray-200" />

              {/* Photo grid — 3×3 with "+" placeholders */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="grid grid-cols-3 gap-2" onPointerDown={() => { if (longPressId) setLongPressId(null); }}>
                {Array.from({ length: 9 }).map((_, i) => {
                  const m = media?.[i];
                  if (m) {
                    const isLongPressed = longPressId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (isLongPressed) {
                            deleteMediaMutation.mutate(m.id, {
                              onSuccess: () => setLongPressId(null),
                            });
                          } else if (m.public_url) {
                            setViewingPhoto({ url: m.public_url, id: m.id });
                          }
                        }}
                        onPointerDown={() => {
                          longPressTimer.current = setTimeout(() => {
                            setLongPressId(m.id);
                          }, 500);
                        }}
                        onPointerUp={() => {
                          if (longPressTimer.current) clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }}
                        onPointerLeave={() => {
                          if (longPressTimer.current) clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`relative aspect-square overflow-hidden rounded-xl transition-all ${
                          isLongPressed
                            ? "ring-2 ring-red-500"
                            : "bg-[#f5f6f8]"
                        }`}
                      >
                        {m.public_url ? (
                          <img
                            src={m.public_url}
                            alt=""
                            className={`h-full w-full object-cover transition-opacity ${isLongPressed ? "opacity-30" : ""}`}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Camera size={20} className="text-gray-400" />
                          </div>
                        )}
                        {isLongPressed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                            <Trash2 size={28} className="text-red-500" />
                          </div>
                        )}
                      </button>
                    );
                  }
                  if (i === photoCount) {
                    return (
                      <button
                        key={`add-${i}`}
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[#0f1d32]/20 bg-[#f5f6f8] transition-colors active:border-blue-400 active:bg-blue-50 disabled:opacity-50"
                      >
                        {uploading ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera size={24} className="text-[#0f1d32]/60" />
                            <span className="text-xs font-semibold text-[#0f1d32]/60">Add</span>
                          </div>
                        )}
                      </button>
                    );
                  }
                  return (
                    <div
                      key={`empty-${i}`}
                      className="flex aspect-square items-center justify-center rounded-xl bg-[#f5f6f8]"
                    >
                      <span className="text-2xl font-medium text-[#0f1d32]/25">+</span>
                    </div>
                  );
                })}
              </div>
              {uploading && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  Compressing & uploading…
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full-screen photo viewer */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="flex items-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
            <button
              onClick={() => setViewingPhoto(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
              aria-label="Close"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewingPhoto.url}
              alt=""
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMediaMutation.mutate(viewingPhoto.id, {
                  onSuccess: () => setViewingPhoto(null),
                });
              }}
              disabled={deleteMediaMutation.isPending}
              className="flex items-center gap-2 rounded-full bg-red-500/90 px-6 py-3 text-sm font-medium text-white backdrop-blur-md active:bg-red-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
              {deleteMediaMutation.isPending ? "Deleting…" : "Delete photo"}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div className="w-full max-w-sm animate-slide-up rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />
            <p className="text-center text-lg font-semibold text-[#0f1d32]">
              Delete this point?
            </p>
            <p className="mt-2 text-center text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl bg-[#f5f6f8] py-3.5 text-base font-medium text-[#0f1d32] active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-red-500 py-3.5 text-base font-medium text-white active:bg-red-600 disabled:opacity-50"
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
