"use client";

import { ArrowLeft, Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { createCircuit } from "@/lib/circuits";

interface FormValues {
  title: string;
  description: string;
}

function NewCircuit() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      createCircuit({
        title: data.title,
        description: data.description || undefined,
      }),
    onSuccess: (circuit) => {
      toast.success("Circuit created");
      router.push(`/circuits/${circuit.id}`);
    },
    onError: () => toast.error("Could not create circuit — try again"),
  });

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
        <h1 className="text-xl font-bold tracking-tight text-white">
          New Circuit
        </h1>
      </header>

      <main className="px-5 pb-10">
        <div className="mb-6 flex h-44 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <div className="text-center">
            <Camera size={28} className="mx-auto mb-2 text-zinc-600" />
            <p className="text-sm text-zinc-500">Cover photo</p>
            <p className="text-xs text-zinc-600">Coming in Phase 3</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <div>
            <input
              type="text"
              placeholder="Circuit name"
              autoComplete="off"
              {...register("title", {
                required: "Give your circuit a name",
                minLength: { value: 1, message: "Name is required" },
                maxLength: { value: 200, message: "200 characters max" },
              })}
              className={`w-full rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white placeholder-zinc-500 outline-none ring-1 ${
                errors.title
                  ? "ring-red-500/60 focus:ring-red-500"
                  : "ring-white/[0.12] focus:ring-blue-500/60"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-400">{errors.title.message}</p>
            )}
          </div>

          <textarea
            placeholder="Description (optional)"
            rows={3}
            {...register("description")}
            className="w-full resize-none rounded-xl bg-white/[0.08] px-4 py-4 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-4 rounded-xl bg-blue-500 py-4 text-base font-semibold text-white active:bg-blue-600 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Create circuit"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewCircuitPage() {
  return (
    <AuthGuard>
      <NewCircuit />
    </AuthGuard>
  );
}
