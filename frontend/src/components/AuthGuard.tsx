"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

let cachedAuthValid = false;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(cachedAuthValid);
  const [show, setShow] = useState(cachedAuthValid);

  useEffect(() => {
    if (cachedAuthValid) return;

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user && !error) {
        cachedAuthValid = true;
        setReady(true);
        requestAnimationFrame(() => setShow(true));
      } else {
        cachedAuthValid = false;
        supabase.auth.signOut();
        router.replace("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        cachedAuthValid = false;
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b1120]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div
      className={`transition-opacity duration-300 ease-out ${show ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}
