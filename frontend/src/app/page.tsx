"use client";

import { Compass, MapPin, Share2, Star } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Globe = dynamic(() => import("@/components/Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
    </div>
  ),
});

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b1120]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120] text-white">
      {/* Hero — globe + branding */}
      <div className="relative flex flex-col items-center">
        {/* Globe container */}
        <div className="h-[55dvh] w-full">
          <Globe />
        </div>

        {/* Branding overlay on top of globe */}
        <div className="absolute left-0 right-0 top-[max(env(safe-area-inset-top),2rem)] flex flex-col items-center">
          <div className="flex items-center gap-2.5">
            <Compass size={28} className="text-white/90" />
            <h1 className="text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,.5)]">
              offroute
            </h1>
          </div>
        </div>

        {/* Gradient fade at bottom of globe */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0b1120] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-8 flex flex-1 flex-col px-6">
        <h2 className="text-center text-2xl font-bold leading-tight">
          Log travel as circuits.
          <br />
          <span className="text-white/60">Share your routes.</span>
        </h2>

        <p className="mt-4 text-center text-sm leading-relaxed text-white/50">
          Curate ordered routes of your favourite places. Pin points, rate
          spots, share with friends — your travel journal, mapped.
        </p>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]">
            <MapPin size={22} className="text-white/70" />
            <p className="text-center text-[11px] font-medium text-white/60">
              Pin points along your route
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]">
            <Share2 size={22} className="text-white/70" />
            <p className="text-center text-[11px] font-medium text-white/60">
              Share circuits with a link
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]">
            <Star size={22} className="text-white/70" />
            <p className="text-center text-[11px] font-medium text-white/60">
              Star and clone others&apos; routes
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
          <Link
            href="/login"
            className="flex items-center justify-center rounded-full bg-white py-4 text-base font-semibold text-[#0f1d32] active:bg-gray-100"
          >
            Get started
          </Link>
          <p className="text-center text-xs text-white/40">
            Free forever. No ads.
          </p>
        </div>
      </div>
    </div>
  );
}
