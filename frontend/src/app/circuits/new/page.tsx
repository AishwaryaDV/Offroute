"use client";

import { ArrowLeft } from "lucide-react";
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
          New Circuit
        </h1>
      </header>

      <main className="px-5 pb-10">
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
              className={`w-full rounded-xl bg-white px-4 py-4 text-base text-black outline-none ring-1 ${
                errors.title
                  ? "ring-red-400 focus:ring-red-500"
                  : "ring-zinc-200 focus:ring-2 focus:ring-zinc-400"
              } dark:bg-zinc-900 dark:text-white dark:ring-zinc-800`}
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <textarea
            placeholder="Description (optional)"
            rows={3}
            {...register("description")}
            className="w-full resize-none rounded-xl bg-white px-4 py-4 text-base text-black outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-4 rounded-xl bg-black py-4 text-base font-semibold text-white active:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:active:bg-zinc-200"
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
