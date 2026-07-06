"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  async function onSubmit({ email, password }: FormValues) {
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.push("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
      } else {
        toast.success("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <main className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-black dark:text-white">
          Offroute
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            {...register("email")}
            className="rounded-lg bg-white px-4 py-3 text-black outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            {...register("password")}
            className="rounded-lg bg-white px-4 py-3 text-black outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-black py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={signInWithGoogle}
          className="mt-4 w-full rounded-lg bg-white py-3 font-medium text-black ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-black underline dark:text-white"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </main>
    </div>
  );
}
