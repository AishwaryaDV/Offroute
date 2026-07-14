"use client";

import { ArrowLeft, Camera, Tag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { TagInput } from "@/components/TagInput";
import { createCircuit } from "@/lib/circuits";

interface FormValues {
  title: string;
  description: string;
}

function NewCircuit() {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
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
        tags: tags.length > 0 ? tags : undefined,
      }),
    onSuccess: (circuit) => {
      toast.success("Circuit created");
      router.push(`/circuits/${circuit.id}`);
    },
    onError: () => toast.error("Could not create circuit — try again"),
  });

  return (
    <div className="min-h-[100dvh] bg-[#f5f6f8]">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#f5f6f8] px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm active:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-[#0f1d32]" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#0f1d32]">
          New Circuit
        </h1>
      </header>

      <main className="px-5 pb-10">
        <div className="mb-6 flex h-44 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200">
          <div className="text-center">
            <Camera size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Cover photo</p>
            <p className="text-xs text-gray-400">Coming soon</p>
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
              className={`w-full rounded-xl bg-white px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                errors.title
                  ? "ring-red-400 focus:ring-red-500"
                  : "ring-gray-200 focus:ring-blue-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <textarea
            placeholder="Description (optional)"
            rows={3}
            {...register("description")}
            className="w-full resize-none rounded-xl bg-white px-4 py-3.5 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200 focus:ring-blue-500"
          />

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
              <Tag size={14} />
              <span>Tags</span>
            </div>
            <TagInput tags={tags} onChange={setTags} />
          </div>

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
