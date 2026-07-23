"use client";

import { Fragment } from "react";
import {
  ArrowLeft,
  ArrowDownUp,
  Check,
  Copy,
  Download,
  FolderOpen,
  Gem,
  GripVertical,
  Home,
  Landmark,
  Leaf,
  MapPin,
  MoreVertical,
  Mountain,
  Pencil,
  Plus,
  Share2,
  Star,
  Tag,
  Trash2,
  UserPlus,
  Users,
  Utensils,
  Wine,
  X,
  Zap,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import type { MapMarker, MapHandle } from "@/components/MapDynamic";
import { TagInput } from "@/components/TagInput";
import { getCircuit, deleteCircuit, shareCircuit, updateCircuit, starCircuit, unstarCircuit } from "@/lib/circuits";
import { getCollaborators, inviteCollaborator, removeCollaborator } from "@/lib/collaborators";
import { getPoints, deletePoint, reorderPoints } from "@/lib/points";
import { exportCircuitPdf } from "@/lib/exportPdf";
import { getTrips, addCircuitToTrip, removeCircuitFromTrip } from "@/lib/trips";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { Collaborator, Point, Trip } from "@/types/api";

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

const POINT_PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1528164344705-47542687000d?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=320&h=200&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=320&h=200&fit=crop",
];

function SortablePointCard({
  point,
  index,
}: {
  point: Point;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: point.id });

  const cat = point.category ?? "other";
  const Icon = CATEGORY_ICONS[cat] ?? MapPin;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 0,
      }}
      className="flex shrink-0 flex-col items-center gap-1"
    >
      <div
        {...attributes}
        {...listeners}
        className="relative h-[72px] w-[72px] overflow-hidden rounded-xl ring-1 ring-white/20"
      >
        <img
          src={POINT_PLACEHOLDER_IMAGES[index % POINT_PLACEHOLDER_IMAGES.length]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <Icon size={16} className="text-white/80" />
          <span className="mt-0.5 text-[10px] font-bold text-white/60">{index + 1}</span>
        </div>
        <div className="absolute right-0.5 top-0.5">
          <GripVertical size={12} className="text-white/40" />
        </div>
      </div>
      <p className="max-w-[72px] truncate text-center text-[10px] font-medium text-white/70">
        {point.title}
      </p>
    </div>
  );
}

function CircuitDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userGeo = useUserLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const mapHandleRef = useRef<MapHandle | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderList, setReorderList] = useState<Point[]>([]);
  const [showEditCircuit, setShowEditCircuit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "shared" | "public">("private");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(touchSensor, pointerSensor);

  const { data: circuit } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id),
  });

  const { data: points, isLoading: pointsLoading } = useQuery({
    queryKey: ["points", id],
    queryFn: () => getPoints(id),
  });

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators", id],
    queryFn: () => getCollaborators(id),
    enabled: showCollaborators,
  });

  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: getTrips,
    enabled: showTripPicker,
  });

  const assignTripMutation = useMutation({
    mutationFn: (tripId: string) => addCircuitToTrip(tripId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setShowTripPicker(false);
      toast.success("Moved to trip");
    },
    onError: () => toast.error("Could not move circuit"),
  });

  const unassignTripMutation = useMutation({
    mutationFn: (tripId: string) => removeCircuitFromTrip(tripId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setShowTripPicker(false);
      toast.success("Removed from trip");
    },
    onError: () => toast.error("Could not remove circuit"),
  });

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      (points ?? []).map((p: Point, i: number) => ({
        id: p.id,
        lng: p.longitude,
        lat: p.latitude,
        label: String(i + 1),
        category: p.category ?? undefined,
      })),
    [points],
  );

  const deleteCircuitMutation = useMutation({
    mutationFn: () => deleteCircuit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast.success("Circuit deleted");
      router.replace("/dashboard");
    },
    onError: () => toast.error("Could not delete circuit"),
  });

  const deletePointMutation = useMutation({
    mutationFn: deletePoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", id] });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      setShowDeleteConfirm(null);
      toast.success("Point deleted");
    },
    onError: () => toast.error("Could not delete point"),
  });

  const updateTagsMutation = useMutation({
    mutationFn: (tags: string[]) => updateCircuit(id, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      setShowTagEditor(false);
      toast.success("Tags updated");
    },
    onError: () => toast.error("Could not update tags"),
  });

  const editCircuitMutation = useMutation({
    mutationFn: () =>
      updateCircuit(id, {
        title: editTitle.trim() || undefined,
        description: editDesc.trim() || undefined,
        visibility: editVisibility,
        start_date: editStartDate || undefined,
        end_date: editEndDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      setShowEditCircuit(false);
      toast.success("Circuit updated");
    },
    onError: () => toast.error("Could not update circuit"),
  });

  function openEditCircuit() {
    setShowMenu(false);
    setEditTitle(circuit?.title ?? "");
    setEditDesc(circuit?.description ?? "");
    setEditVisibility(circuit?.visibility ?? "private");
    setEditStartDate(circuit?.start_date ?? "");
    setEditEndDate(circuit?.end_date ?? "");
    setShowEditCircuit(true);
  }

  const starMutation = useMutation({
    mutationFn: () =>
      circuit?.is_starred ? unstarCircuit(id) : starCircuit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
    },
    onError: () => toast.error("Could not update star"),
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteCollaborator(id, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", id] });
      setInviteEmail("");
      toast.success("Invite sent");
    },
    onError: (err: Error) =>
      toast.error(
        err.message?.includes("404")
          ? "No user found with that email"
          : err.message?.includes("409")
            ? "User already invited"
            : "Could not send invite"
      ),
  });

  const removeMutation = useMutation({
    mutationFn: (collabId: string) => removeCollaborator(id, collabId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", id] });
      toast.success("Collaborator removed");
    },
    onError: () => toast.error("Could not remove collaborator"),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedPoints: Point[]) =>
      reorderPoints(
        id,
        orderedPoints.map((p, i) => ({ id: p.id, order_index: i })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", id] });
      setReordering(false);
      toast.success("Order saved");
    },
    onError: () => toast.error("Could not save order"),
  });

  function startReorder() {
    setShowMenu(false);
    if (points && points.length > 1) {
      setReorderList([...points]);
      setReordering(true);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setReorderList((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSelectPoint(point: Point) {
    if (activePointId === point.id) {
      router.push(`/circuits/${id}/points/${point.id}`);
      return;
    }
    setActivePointId(point.id);
    mapHandleRef.current?.flyTo(point.longitude, point.latitude, 14);
  }

  async function handleShare() {
    setShowMenu(false);
    try {
      const { share_token } = await shareCircuit(id);
      const url = `${window.location.origin}/s/${share_token}`;
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
        toast.success("Share link copied");
      }
    } catch {
      toast.error("Could not generate share link");
    }
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
      {/* Full-screen map */}
      {mapMarkers.length > 0 ? (
        <MapDynamic
          className="absolute inset-0 h-full w-full"
          markers={mapMarkers}
          activeMarkerId={activePointId ?? undefined}
          drawRoute
          interactive
          onMarkerClick={(markerId) => {
            const pt = points?.find((p) => p.id === markerId);
            if (pt) handleSelectPoint(pt);
          }}
          onMapInit={(handle) => {
            mapHandleRef.current = handle;
          }}
          key={mapMarkers.length}
        />
      ) : (
        <MapDynamic
          className="absolute inset-0 h-full w-full"
          center={userGeo.center}
          zoom={4}
          interactive
        />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-white" />
        </Link>

        <div className="mx-3 min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
            {circuit?.title ?? ""}
          </p>
          {circuit?.description && (
            <p className="truncate text-xs text-white/60">
              {circuit.description}
            </p>
          )}
          {circuit?.tags && circuit.tags.length > 0 && (
            <div className="mt-1 flex justify-center gap-1">
              {circuit.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
              {circuit.tags.length > 3 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                  +{circuit.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(circuit?.clone_count ?? 0) > 0 && (
            <div className="flex h-10 items-center gap-1 rounded-full bg-black/50 px-3 backdrop-blur-md">
              <Copy size={14} className="text-white/70" />
              <span className="text-xs font-semibold text-white">
                {circuit?.clone_count}
              </span>
            </div>
          )}
          <button
            onClick={() => starMutation.mutate()}
            disabled={starMutation.isPending}
            className="flex h-10 items-center gap-1 rounded-full bg-black/50 px-3 backdrop-blur-md active:bg-black/70 disabled:opacity-50"
            aria-label={circuit?.is_starred ? "Unstar" : "Star"}
          >
            <Star
              size={16}
              className={circuit?.is_starred ? "fill-amber-400 text-amber-400" : "text-white"}
            />
            {(circuit?.star_count ?? 0) > 0 && (
              <span className="text-xs font-semibold text-white">
                {circuit?.star_count}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md active:bg-black/70"
            aria-label="Menu"
          >
            <MoreVertical size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Cloned-from banner */}
      {circuit?.cloned_from_token && (
        <Link
          href={`/s/${circuit.cloned_from_token}`}
          className="absolute left-4 top-[calc(max(env(safe-area-inset-top),0.75rem)+3.5rem)] z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-[#0f1d32] shadow-md backdrop-blur-md active:bg-white"
        >
          <Copy size={12} className="text-gray-500" />
          View original circuit
        </Link>
      )}

      {/* Actions menu dropdown */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-[calc(max(env(safe-area-inset-top),0.75rem)+3rem)] z-30 w-48 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <button
              onClick={openEditCircuit}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <Pencil size={16} className="text-gray-400" />
              Edit circuit
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={handleShare}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <Share2 size={16} className="text-gray-400" />
              Share circuit
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={() => {
                setShowMenu(false);
                if (circuit && points) exportCircuitPdf(circuit, points);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <Download size={16} className="text-gray-400" />
              Export PDF
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={() => {
                setShowMenu(false);
                setShowTripPicker(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <FolderOpen size={16} className="text-gray-400" />
              {circuit?.trip_id ? "Change trip" : "Move to trip"}
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={startReorder}
              disabled={!points || points.length < 2}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50 disabled:opacity-30"
            >
              <ArrowDownUp size={16} className="text-gray-400" />
              Reorder points
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={() => {
                setShowMenu(false);
                setEditTags(circuit?.tags ?? []);
                setShowTagEditor(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <Tag size={16} className="text-gray-400" />
              Edit tags
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={() => {
                setShowMenu(false);
                setShowCollaborators(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#0f1d32] active:bg-gray-50"
            >
              <Users size={16} className="text-gray-400" />
              Collaborators
            </button>
            <div className="mx-4 h-px bg-gray-100" />
            <button
              onClick={() => {
                setShowMenu(false);
                setShowDeleteConfirm("circuit");
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 active:bg-gray-50"
            >
              <Trash2 size={16} />
              Delete circuit
            </button>
          </div>
        </>
      )}

      {/* Bottom carousel */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div>
          {pointsLoading ? null : reordering && reorderList.length > 1 ? (
            <div className="px-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setReordering(false)}
                  className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md active:bg-white/25"
                >
                  Cancel
                </button>
                <p className="text-xs font-semibold text-white/60">Hold & drag to reorder</p>
                <button
                  onClick={() => reorderMutation.mutate(reorderList)}
                  disabled={reorderMutation.isPending}
                  className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0f1d32] active:bg-gray-100 disabled:opacity-50"
                >
                  <Check size={14} />
                  {reorderMutation.isPending ? "Saving…" : "Done"}
                </button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={reorderList.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex items-start gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {reorderList.map((point, i) => (
                      <SortablePointCard key={point.id} point={point} index={i} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : points && points.length > 0 ? (
            <div className="flex items-stretch gap-3 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {points.map((point: Point, i: number) => {
                const cat = point.category ?? "other";
                const Icon = CATEGORY_ICONS[cat] ?? MapPin;
                const isActive = activePointId === point.id;

                return (
                  <Fragment key={point.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPoint(point)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSelectPoint(point);
                      }}
                      className={`flex min-w-[160px] max-w-[180px] shrink-0 gap-2.5 overflow-hidden rounded-2xl bg-white/15 p-2.5 text-left backdrop-blur-md transition-all ${
                        isActive
                          ? "ring-2 ring-white/50 scale-[1.02]"
                          : "ring-1 ring-white/10"
                      }`}
                    >
                      <img
                        src={POINT_PLACEHOLDER_IMAGES[i % POINT_PLACEHOLDER_IMAGES.length]}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon size={12} className="shrink-0 text-white/60" />
                          <span className="text-[10px] font-bold text-white/40">
                            {i + 1}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-white">
                          {point.title}
                        </p>
                        {point.category && (
                          <p className="truncate text-[10px] capitalize text-white/50">
                            {point.category.replace("_", " ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/circuits/${id}/points/new`}
                      className="flex shrink-0 items-center"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-md active:bg-white/25">
                        <Plus size={18} className="text-white" />
                      </div>
                    </Link>
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="px-5">
              <div className="rounded-2xl bg-white/10 px-5 py-5 text-center ring-1 ring-white/10 backdrop-blur-xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25">
                  <Plus size={28} strokeWidth={2.5} className="text-white" />
                </div>
                <p className="text-base font-bold text-white">
                  Add your first point
                </p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs text-zinc-400">
                  Mark a location on the map and bring it to life with notes and details.
                </p>
                <Link
                  href={`/circuits/${id}/points/new`}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f1d32] active:bg-zinc-200"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Add
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit circuit sheet */}
      {showEditCircuit && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditCircuit(false);
          }}
        >
          <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-2xl font-bold text-[#0f1d32]">Edit circuit</h2>
              <button
                onClick={() => editCircuitMutation.mutate()}
                disabled={!editTitle.trim() || editCircuitMutation.isPending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1d32] active:bg-[#162a46] disabled:opacity-50"
                aria-label="Save"
              >
                <Check size={20} className="text-white" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl bg-[#f5f6f8] px-4 py-3 text-base text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                  placeholder="Circuit title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-xl bg-[#f5f6f8] px-4 py-3 text-base text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                  placeholder="What's this circuit about?"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-400">Start date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-400">End date</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#0f1d32] outline-none ring-1 ring-gray-200 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Visibility</label>
                <div className="flex gap-2">
                  {(["private", "shared", "public"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditVisibility(v)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-medium capitalize ring-1 transition-colors ${
                        editVisibility === v
                          ? "bg-[#0f1d32] text-white ring-[#0f1d32]"
                          : "bg-white text-gray-600 ring-gray-200 active:bg-gray-50"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag editor sheet */}
      {showTagEditor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTagEditor(false);
          }}
        >
          <div className="w-full max-w-sm animate-slide-up rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />
            <p className="text-center text-lg font-semibold text-[#0f1d32]">
              Edit tags
            </p>
            <div className="mt-4">
              <TagInput tags={editTags} onChange={setEditTags} />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowTagEditor(false)}
                className="flex-1 rounded-xl bg-[#f5f6f8] py-3.5 text-base font-medium text-[#0f1d32] active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => updateTagsMutation.mutate(editTags)}
                disabled={updateTagsMutation.isPending}
                className="flex-1 rounded-xl bg-blue-500 py-3.5 text-base font-medium text-white active:bg-blue-600 disabled:opacity-50"
              >
                {updateTagsMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborators sheet */}
      {showCollaborators && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCollaborators(false);
          }}
        >
          <div className="max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-[#0f1d32]">Collaborators</p>
              <button
                onClick={() => setShowCollaborators(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Invite form */}
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="min-w-0 flex-1 rounded-xl bg-[#f5f6f8] px-3 py-2.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
              />
              <button
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="flex items-center gap-1 rounded-xl bg-[#0f1d32] px-3 py-2.5 text-sm font-medium text-white active:bg-[#162a46] disabled:opacity-50"
              >
                <UserPlus size={14} />
                Invite
              </button>
            </div>

            {/* Role toggle */}
            <div className="mt-3 flex gap-2">
              {(["viewer", "editor"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize ring-1 transition-colors ${
                    inviteRole === r
                      ? "bg-[#0f1d32] text-white ring-[#0f1d32]"
                      : "bg-white text-gray-600 ring-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Collaborator list */}
            <div className="mt-5 flex flex-col gap-2">
              {collaborators && collaborators.length > 0 ? (
                collaborators.map((c: Collaborator) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-[#f5f6f8] px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0f1d32]">
                        {c.user_display_name || c.user_email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.role} · {c.status}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(c.id)}
                      disabled={removeMutation.isPending}
                      className="ml-2 rounded-full p-1.5 text-gray-400 active:bg-gray-200 active:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">
                  No collaborators yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(null);
          }}
        >
          <div className="w-full max-w-sm animate-slide-up rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />
            <p className="text-center text-lg font-semibold text-[#0f1d32]">
              {showDeleteConfirm === "circuit"
                ? "Delete this circuit and all its points?"
                : "Delete this point?"}
            </p>
            <p className="mt-2 text-center text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-xl bg-[#f5f6f8] py-3.5 text-base font-medium text-[#0f1d32] active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm === "circuit") {
                    deleteCircuitMutation.mutate();
                  } else {
                    deletePointMutation.mutate(showDeleteConfirm);
                  }
                }}
                disabled={
                  deleteCircuitMutation.isPending ||
                  deletePointMutation.isPending
                }
                className="flex-1 rounded-xl bg-red-500 py-3.5 text-base font-medium text-white active:bg-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip picker sheet */}
      {showTripPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTripPicker(false);
          }}
        >
          <div className="max-h-[60dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <button
                onClick={() => setShowTripPicker(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Move to trip</h2>
              <div className="w-9" />
            </div>

            {circuit?.trip_id && (
              <div className="px-5 pb-3">
                <button
                  onClick={() => unassignTripMutation.mutate(circuit.trip_id!)}
                  className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 active:bg-gray-50"
                >
                  Remove from trip
                </button>
              </div>
            )}

            {!trips || trips.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FolderOpen size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No trips yet — create one from the Circuits page
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-5">
                {trips.map((trip: Trip) => (
                  <button
                    key={trip.id}
                    onClick={() => assignTripMutation.mutate(trip.id)}
                    disabled={circuit?.trip_id === trip.id}
                    className={`flex items-center justify-between rounded-2xl p-4 text-left active:bg-gray-100 disabled:opacity-40 ${
                      circuit?.trip_id === trip.id ? "bg-blue-50" : "bg-[#f5f6f8]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0f1d32]">
                        {trip.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {trip.circuit_count} {trip.circuit_count === 1 ? "circuit" : "circuits"}
                      </p>
                    </div>
                    {circuit?.trip_id === trip.id && (
                      <span className="text-xs font-medium text-blue-500">Current</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CircuitDetailPage() {
  return (
    <AuthGuard>
      <CircuitDetail />
    </AuthGuard>
  );
}
