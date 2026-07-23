"use client";

import { Compass, Globe, MapPin, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StepLoader } from "@/components/StepLoader";
import { getPublicProfile, getPublicCircuits } from "@/lib/profiles";
import type { PublicCircuit } from "@/types/api";

function PublicProfile() {
  const { username } = useParams<{ username: string }>();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => getPublicProfile(username),
  });

  const { data: circuits } = useQuery({
    queryKey: ["profile-circuits", username],
    queryFn: () => getPublicCircuits(username),
    enabled: !!profile,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <StepLoader variant="light" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 text-center">
        <Globe size={48} className="mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-[#0f1d32]">Profile not found</h1>
        <p className="mt-2 text-gray-500">
          This user doesn&apos;t exist or hasn&apos;t enabled their public profile.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-[#0f1d32] px-6 py-3 text-sm font-semibold text-white"
        >
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Header */}
      <div className="bg-[#0b1120] px-6 pb-8 pt-[max(env(safe-area-inset-top),3rem)]">
        <div className="flex items-center gap-2 pb-6">
          <Compass size={18} className="text-white/60" />
          <span className="text-sm font-semibold text-white/60">offroute</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 text-3xl font-bold text-white">
            {(profile.display_name?.[0] ?? profile.username[0]).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white">
              {profile.display_name ?? profile.username}
            </h1>
            <p className="text-sm text-white/50">@{profile.username}</p>
            {profile.nationality && (
              <p className="mt-0.5 text-sm text-white/40">{profile.nationality}</p>
            )}
          </div>
        </div>

        {profile.profile_bio && (
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            {profile.profile_bio}
          </p>
        )}
      </div>

      {/* Circuits */}
      <div className="px-6 pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Public circuits · {circuits?.length ?? 0}
        </p>

        {!circuits || circuits.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No public circuits yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {circuits.map((circuit: PublicCircuit) => (
              <Link
                key={circuit.id}
                href={circuit.share_token ? `/s/${circuit.share_token}` : "#"}
                className="rounded-2xl bg-[#f5f6f8] p-4 active:bg-gray-100"
              >
                <p className="truncate font-semibold text-[#0f1d32]">
                  {circuit.title}
                </p>
                {circuit.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {circuit.description}
                  </p>
                )}
                {circuit.tags && circuit.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {circuit.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#0f1d32]/10 px-2 py-0.5 text-[10px] font-medium text-[#0f1d32]/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {(circuit.start_date || circuit.end_date) && (
                  <p className="mt-2 text-xs text-gray-400">
                    {[circuit.start_date, circuit.end_date].filter(Boolean).join(" → ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  return <PublicProfile />;
}
