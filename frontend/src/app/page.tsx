"use client";

import { Compass, MapPin, Share2, Star } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const Globe = dynamic(() => import("@/components/Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
    </div>
  ),
});

const SLIDES = [
  {
    icon: MapPin,
    title: "Pin points",
    desc: "Mark spots along your route with notes, categories & ratings",
  },
  {
    icon: Share2,
    title: "Share circuits",
    desc: "Send your route to friends or publish it for the world",
  },
  {
    icon: Star,
    title: "Discover & clone",
    desc: "Star routes you love and clone them as your own",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (delta < -40) setSlide((s) => (s + 1) % SLIDES.length);
      else if (delta > 40) setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length);
    },
    [],
  );

  if (checking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#060d1b]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  const { icon: Icon, title, desc } = SLIDES[slide];

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060d1b] text-white">
      {/* Star field background */}
      <div className="stars" />
      <div className="twinkle-1" />
      <div className="twinkle-2" />
      <div className="twinkle-3" />
      <div className="comet comet-1" />
      <div className="comet comet-2" />

      {/* Branding — top */}
      <div className="relative z-10 flex items-center gap-2.5 px-6 pt-[max(env(safe-area-inset-top),2rem)]">
        <Compass size={24} className="text-white/80" />
        <h1 className="text-2xl font-bold tracking-tight text-white/90">
          Offroute
        </h1>
      </div>

      {/* Globe — center, large */}
      <div className="relative z-0 flex flex-1 items-center justify-center">
        <div className="globe-halo" />
        <div className="globe-3d-wrapper">
          <Globe />
        </div>
      </div>

      {/* Bottom section — carousel + CTA */}
      <div className="relative z-10 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Feature carousel */}
        <div
          className="mb-5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/[0.08]">
              <Icon size={22} className="text-white/80" />
            </div>
            <p className="text-base font-bold text-white">{title}</p>
            <p className="mx-auto mt-1.5 max-w-[260px] text-sm leading-relaxed text-white/40">
              {desc}
            </p>
          </div>

          {/* Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide ? "w-5 bg-white/80" : "w-1.5 bg-white/20"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="flex items-center justify-center rounded-full bg-white py-4 text-base font-semibold text-[#0f1d32] active:bg-gray-100"
        >
          Get started
        </Link>
        <p className="mt-3 text-center text-xs text-white/25">
          Free forever. No ads.
        </p>
      </div>

      <style jsx>{`
        .stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1.5px 1.5px at 10% 8%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1.5px 1.5px at 50% 5%, rgba(255,255,255,0.55), transparent),
            radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 85% 45%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1px 1px at 15% 60%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1.5px 1.5px at 92% 12%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 65% 55%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 5% 80%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1.5px 1.5px at 35% 3%, rgba(255,255,255,0.45), transparent),
            radial-gradient(1px 1px at 55% 85%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 80% 70%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 20% 90%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 95% 60%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1px 1px at 45% 25%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1.5px 1.5px at 75% 4%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 30% 50%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1px 1px at 8% 30%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 18% 12%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 42% 92%, rgba(255,255,255,0.15), transparent),
            radial-gradient(1.5px 1.5px at 3% 48%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 88% 82%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1px 1px at 72% 38%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 58% 65%, rgba(255,255,255,0.15), transparent),
            radial-gradient(1px 1px at 97% 28%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 12% 95%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1.5px 1.5px at 82% 7%, rgba(255,255,255,0.45), transparent),
            radial-gradient(1px 1px at 48% 48%, rgba(255,255,255,0.15), transparent);
        }
        .globe-3d-wrapper {
          position: relative;
          width: min(360px, 85vw);
          height: min(360px, 85vw);
          z-index: 1;
          border-radius: 50%;
          overflow: hidden;
        }
        .globe-halo {
          position: absolute;
          width: min(500px, 120vw);
          height: min(500px, 120vw);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(56, 189, 248, 0.08) 30%,
            rgba(56, 189, 248, 0.2) 38%,
            rgba(56, 189, 248, 0.25) 42%,
            rgba(56, 189, 248, 0.15) 50%,
            rgba(56, 189, 248, 0.06) 60%,
            rgba(56, 189, 248, 0.02) 70%,
            transparent 80%
          );
          z-index: 0;
        }
        .twinkle-1, .twinkle-2, .twinkle-3 {
          position: absolute;
          border-radius: 50%;
          background: white;
        }
        .twinkle-1 {
          width: 3px; height: 3px;
          top: 6%; left: 12%;
          animation: twinkle 2s ease-in-out infinite;
        }
        .twinkle-2 {
          width: 2.5px; height: 2.5px;
          top: 14%; right: 8%;
          animation: twinkle 2.5s ease-in-out 0.7s infinite;
        }
        .twinkle-3 {
          width: 2px; height: 2px;
          top: 3%; left: 55%;
          animation: twinkle 3s ease-in-out 1.2s infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .comet {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 4px 1px rgba(255,255,255,0.6);
        }
        .comet::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 100%;
          width: 40px;
          height: 1px;
          background: linear-gradient(to left, rgba(255,255,255,0.6), transparent);
          transform: translateY(-50%);
        }
        .comet-1 {
          top: 10%; left: -10%;
          animation: comet-streak 6s linear 2s infinite;
        }
        .comet-2 {
          top: 28%; left: -10%;
          animation: comet-streak 8s linear 5s infinite;
        }
        @keyframes comet-streak {
          0% { transform: translate(-10%, 0); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(110vw, 20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
