"use client";

import { ArrowLeft, ChevronRight, LogOut, User, Mail, Shield } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { getMe, updateMe } from "@/lib/me";
import { supabase } from "@/lib/supabase";

interface FormValues {
  display_name: string;
}

function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [showProfile, setShowProfile] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    values: { display_name: me?.display_name ?? "" },
  });

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Saved");
      setShowProfile(false);
    },
    onError: () => toast.error("Could not save — try again"),
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b1120]">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#0b1120]/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-xl">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] active:bg-white/[0.12]"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-white">Settings</h1>
      </header>

      <main className="px-5 pb-10">
        {/* Profile card */}
        {me && (
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.08]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-400">
              {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                {me.display_name ?? "No name set"}
              </p>
              <p className="text-sm text-zinc-400">{me.email}</p>
            </div>
          </div>
        )}

        {/* Menu sections */}
        <div className="space-y-2">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/[0.08] active:bg-white/[0.1]"
          >
            <User size={20} className="text-zinc-400" />
            <span className="flex-1 text-left text-base text-white">Profile</span>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/[0.08] opacity-50">
            <Mail size={20} className="text-zinc-400" />
            <span className="flex-1 text-left text-base text-white">Notifications</span>
            <span className="text-xs text-zinc-500">Coming soon</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/[0.08] opacity-50">
            <Shield size={20} className="text-zinc-400" />
            <span className="flex-1 text-left text-base text-white">Account</span>
            <span className="text-xs text-zinc-500">Coming soon</span>
          </div>
        </div>

        {/* Profile edit (expandable) */}
        {showProfile && (
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="mt-4 flex flex-col gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.06]"
          >
            <label className="text-sm font-medium text-zinc-400" htmlFor="display_name">
              Display name
            </label>
            <input
              id="display_name"
              placeholder="How you appear to others"
              {...register("display_name")}
              className="w-full rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl bg-blue-500 py-3.5 text-base font-semibold text-white active:bg-blue-600 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-red-400 ring-1 ring-white/[0.08] active:bg-white/[0.04]"
        >
          <LogOut size={18} />
          Log out
        </button>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Settings />
    </AuthGuard>
  );
}
