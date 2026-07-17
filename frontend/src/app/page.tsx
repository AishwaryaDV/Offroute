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
              Offroute
            </h1>
          </div>
        </div>

        {/* Gradient fade at bottom of globe */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0b1120] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-8 flex flex-1 flex-col px-6">
        <h2 className="text-center text-3xl font-bold leading-tight tracking-tight">
          Your travels,
          <br />
          <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            mapped & shared.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-[280px] text-center text-sm leading-relaxed text-white/50">
          Pin your favourite spots into circuits. Rate, share, and explore routes from travelers worldwide.
        </p>

        {/* Feature highlights */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/[0.08]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <MapPin size={20} className="text-white/80" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">Pin points</p>
              <p className="text-xs text-white/40">Mark spots along your route with notes & ratings</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/[0.08]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Share2 size={20} className="text-white/80" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">Share circuits</p>
              <p className="text-xs text-white/40">Send your route to friends or make it public</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/[0.08]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Star size={20} className="text-white/80" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">Discover & clone</p>
              <p className="text-xs text-white/40">Star routes you love and clone them as your own</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
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
