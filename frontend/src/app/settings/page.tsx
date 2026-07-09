"use client";

import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  const { register, handleSubmit } = useForm<FormValues>({
    values: { display_name: me?.display_name ?? "" },
  });

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Saved");
    },
    onError: () => toast.error("Could not save — try again"),
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-zinc-50/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md dark:bg-black/80">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-zinc-600 dark:text-zinc-400" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">
          Settings
        </h1>
      </header>

      <main className="px-5 pb-10 sm:mx-auto sm:max-w-md">
        {me && (
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {(me.display_name?.[0] ?? me.email[0]).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-black dark:text-white">
                {me.display_name ?? "No name set"}
              </p>
              <p className="text-sm text-zinc-500">{me.email}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <label className="text-sm font-medium text-zinc-500" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            placeholder="How you appear to others"
            {...register("display_name")}
            className="w-full rounded-xl bg-white px-4 py-4 text-base text-black outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-black py-4 text-base font-semibold text-white active:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:active:bg-zinc-200"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </form>

        <button
          onClick={logout}
          className="mt-12 w-full rounded-xl py-4 text-base font-semibold text-red-600 ring-1 ring-zinc-200 active:bg-red-50 dark:ring-zinc-800 dark:active:bg-zinc-900"
        >
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
