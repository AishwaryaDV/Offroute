"use client";

import {
  Bell,
  BellOff,
  Check,
  Clock,
  Copy,
  MapPin,
  Sparkles,
  Star,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import {
  getNotifications,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/notifications";
import { getMyInvites, acceptInvite, declineInvite } from "@/lib/collaborators";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { Notification, Invite } from "@/types/api";

const NOTIF_ICON: Record<string, typeof Star> = {
  star: Star,
  clone: Copy,
  invite: UserPlus,
  invite_accepted: Users,
  point_added: MapPin,
  point_deleted: MapPin,
  circuit_deleted: Trash2,
  media_deleted: Trash2,
  collaborator_removed: UserMinus,
  assistant_write: Sparkles,
};

const NOTIF_COLORS: Record<string, string> = {
  star: "#f59e0b",
  clone: "#8b5cf6",
  invite: "#3b82f6",
  invite_accepted: "#10b981",
  point_added: "#22c55e",
  point_deleted: "#ef4444",
  circuit_deleted: "#ef4444",
  media_deleted: "#ef4444",
  collaborator_removed: "#ef4444",
  assistant_write: "#0f1d32",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SwipeableNotification({
  notif,
  onDelete,
}: {
  notif: Notification;
  onDelete: (id: string) => void;
}) {
  const Icon = NOTIF_ICON[notif.type] ?? Bell;
  const color = NOTIF_COLORS[notif.type] ?? "#6b7280";
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) return;
    swiping.current = true;
    currentX.current = dx;
    if (ref.current) {
      ref.current.style.transform = `translateX(${Math.max(dx, -120)}px)`;
      ref.current.style.transition = "none";
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!ref.current) return;
    if (currentX.current < -80) {
      ref.current.style.transition = "transform 0.25s ease, opacity 0.25s ease";
      ref.current.style.transform = "translateX(-100%)";
      ref.current.style.opacity = "0";
      setTimeout(() => onDelete(notif.id), 250);
    } else {
      ref.current.style.transition = "transform 0.2s ease";
      ref.current.style.transform = "translateX(0)";
    }
  }, [notif.id, onDelete]);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex w-16 items-center justify-center">
        <X size={18} className="text-[#0f1d32]/40" />
      </div>
      <div
        ref={ref}
        className="relative bg-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3 px-5 py-3.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
            <Icon size={18} style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#0f1d32]">
              {notif.message}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <Clock size={10} className="text-gray-300" />
              <p className="text-[10px] text-gray-400">
                {timeAgo(notif.created_at)}
              </p>
            </div>
          </div>
          {!notif.read && (
            <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userGeo = useUserLocation();
  const [pushDismissed, setPushDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("notif-push-dismissed") === "1";
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const { data: invites } = useQuery({
    queryKey: ["invites"],
    queryFn: getMyInvites,
  });

  useEffect(() => {
    if (!notifications?.some((n) => !n.read)) return;
    markAllRead().then(() => {
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    });
  }, [notifications, queryClient]);

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: declineInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];
  const hasNotifications = notifications && notifications.length > 0;

  function dismissPushBanner() {
    localStorage.setItem("notif-push-dismissed", "1");
    setPushDismissed(true);
  }

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation],
  );

  return (
      <div className="relative h-[100dvh] overflow-hidden bg-[#0b1120]">
        {/* Map background */}
        <div className="pointer-events-none absolute inset-0">
          <MapDynamic center={userGeo.center} zoom={Math.min(userGeo.zoom, 3)} />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        </div>

        {/* White sheet */}
        <div
          className="sheet-up sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-y-auto rounded-t-[28px] bg-white"
          style={{ paddingBottom: "calc(80px + max(0.75rem, env(safe-area-inset-bottom)))" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <header className="flex items-center justify-between px-5 pt-2 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f1d32]">
              Notifications
            </h1>
            <button
              onClick={() => hasNotifications ? clearAllMutation.mutate() : router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
              aria-label={hasNotifications ? "Clear all" : "Close"}
            >
              <X size={20} className="text-[#0f1d32]" strokeWidth={2.5} />
            </button>
          </header>

          {/* Push notification banner */}
          {!pushDismissed && typeof window !== "undefined" && Notification?.permission !== "granted" && (
            <div className="mx-5 mb-4 flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Bell size={20} className="text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0f1d32]">Don&apos;t miss a thing</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Turn on push notifications to know when someone stars or clones your circuits.
                </p>
                <button className="mt-2 rounded-full border border-[#0f1d32]/30 px-3 py-1 text-xs font-medium text-[#0f1d32] active:bg-[#0f1d32]/5">
                  Enable notifications
                </button>
              </div>
              <button onClick={dismissPushBanner} className="shrink-0 p-1 text-gray-300 active:text-gray-500">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="px-5 pb-4">
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-300">
                Pending invites
              </p>
              <div className="flex flex-col gap-2">
                {pendingInvites.map((invite: Invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <UserPlus size={18} className="text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0f1d32]">
                        {invite.invited_by_name ?? "Someone"} invited you to{" "}
                        <span className="font-semibold">{invite.circuit_title}</span>
                      </p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Clock size={10} className="text-gray-300" />
                        <p className="text-[10px] capitalize text-gray-400">
                          as {invite.role} &middot; {timeAgo(invite.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => acceptMutation.mutate(invite.id)}
                        disabled={acceptMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-500 active:bg-emerald-50"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => declineMutation.mutate(invite.id)}
                        disabled={declineMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 active:bg-gray-200"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notification list */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <StepLoader variant="light" />
            </div>
          ) : hasNotifications ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {notifications.map((notif: Notification) => (
                <SwipeableNotification
                  key={notif.id}
                  notif={notif}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <BellOff size={28} className="text-gray-300" />
              </div>
              <p className="mt-4 text-lg font-semibold text-[#0f1d32]">
                No notifications yet
              </p>
              <p className="mt-1 text-sm text-gray-400">
                When someone stars, clones, or invites you to a circuit, it&apos;ll show up here.
              </p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
  );
}

export default NotificationsPage;
