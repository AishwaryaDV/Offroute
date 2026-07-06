"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black">
      <main className="mx-auto max-w-md">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-black dark:text-white">
          Settings
        </h1>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <label className="text-sm text-zinc-500" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            placeholder="How you appear to others"
            {...register("display_name")}
            className="rounded-lg bg-white px-4 py-3 text-black outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-black py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </form>

        {me && (
          <p className="mt-6 text-sm text-zinc-500">Signed in as {me.email}</p>
        )}

        <button
          onClick={logout}
          className="mt-10 w-full rounded-lg py-3 font-medium text-red-600 ring-1 ring-zinc-200 dark:ring-zinc-800"
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
