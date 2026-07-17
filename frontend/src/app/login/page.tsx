"use client";

import { Compass, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, one uppercase, one lowercase, one number, and one special character";

interface LoginValues {
  email: string;
  password: string;
}

interface SignupValues {
  display_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

function PasswordInput({
  id,
  placeholder,
  autoComplete,
  error,
  registration,
}: {
  id: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>["register"]>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          {...registration}
          className={`w-full rounded-xl bg-gray-50 px-4 py-4 pr-12 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
            error
              ? "ring-red-400 focus:ring-red-500"
              : "ring-gray-200 focus:ring-blue-500"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 active:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function LoginForm({
  onSwitch,
  onForgot,
}: {
  onSwitch: () => void;
  onForgot: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginValues>();

  async function onSubmit({ email, password }: LoginValues) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    router.push("/dashboard");
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#0f1d32]">Welcome back</h2>
      <p className="mb-8 text-sm text-gray-500">Log in to continue to Offroute</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            {...register("email", {
              required: "Email is required",
              pattern: { value: EMAIL_REGEX, message: "Enter a valid email" },
            })}
            className={`w-full rounded-xl bg-gray-50 px-4 py-4 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.email
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <PasswordInput
          id="login-password"
          placeholder="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          registration={register("password", {
            required: "Password is required",
          })}
        />

        <button
          type="button"
          onClick={onForgot}
          className="self-end text-sm font-medium text-gray-500 active:text-gray-700"
        >
          Forgot password?
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-full bg-gray-50 py-4 text-base font-medium text-[#0f1d32] ring-1 ring-gray-200 active:bg-gray-100"
      >
        Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold text-[#0f1d32] active:text-[#162a46]"
        >
          Sign up
        </button>
      </p>
    </>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<SignupValues>();

  const passwordValue = watch("password");

  async function onSubmit({ email, password, display_name }: SignupValues) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: display_name } },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created — welcome to Offroute!");
      router.push("/dashboard");
    } else {
      toast.success("Check your email to confirm your account, then log in.");
      onSwitch();
    }
  }

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#0f1d32]">Create your account</h2>
      <p className="mb-8 text-sm text-gray-500">Start logging your travels on Offroute</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <input
            type="text"
            placeholder="Display name"
            autoComplete="name"
            {...register("display_name", {
              required: "Display name is required",
              minLength: { value: 2, message: "At least 2 characters" },
              maxLength: { value: 50, message: "50 characters max" },
            })}
            className={`w-full rounded-xl bg-gray-50 px-4 py-4 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.display_name
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.display_name && (
            <p className="mt-1.5 text-sm text-red-500">{errors.display_name.message}</p>
          )}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            {...register("email", {
              required: "Email is required",
              pattern: { value: EMAIL_REGEX, message: "Enter a valid email" },
            })}
            className={`w-full rounded-xl bg-gray-50 px-4 py-4 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.email
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <PasswordInput
            id="signup-password"
            placeholder="Password"
            autoComplete="new-password"
            error={errors.password?.message}
            registration={register("password", {
              required: "Password is required",
              pattern: { value: PASSWORD_REGEX, message: PASSWORD_HINT },
            })}
          />
          <p className="mt-1.5 text-xs text-gray-400">{PASSWORD_HINT}</p>
        </div>

        <PasswordInput
          id="signup-confirm"
          placeholder="Confirm password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          registration={register("confirm_password", {
            required: "Please confirm your password",
            validate: (val) => val === passwordValue || "Passwords don't match",
          })}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold text-[#0f1d32] active:text-[#162a46]"
        >
          Log in
        </button>
      </p>
    </>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<{ email: string }>();
  const [sent, setSent] = useState(false);

  async function onSubmit({ email }: { email: string }) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#0f1d32]">Reset password</h2>
      <p className="mb-8 text-sm text-gray-500">
        {sent
          ? "Check your inbox for a reset link."
          : "Enter your email and we'll send you a reset link."}
      </p>

      {!sent && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: EMAIL_REGEX, message: "Enter a valid email" },
              })}
              className={`w-full rounded-xl bg-gray-50 px-4 py-4 text-base text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                errors.email
                  ? "ring-red-400 focus:ring-red-500"
                  : "ring-gray-200 focus:ring-blue-500"
              }`}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-[#0f1d32] py-4 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <button
        onClick={onBack}
        className="mt-6 w-full text-center text-sm font-semibold text-[#0f1d32] active:text-[#162a46]"
      >
        Back to log in
      </button>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      {/* Dark header with branding */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex items-center gap-2.5">
          <Compass size={32} className="text-white/80" />
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Offroute
          </h1>
        </div>
        <p className="mt-3 text-base text-white/50">
          Log travel as circuits
        </p>
      </div>

      {/* White sheet with form — half screen */}
      <div className="sheet-up sheet-light max-h-[50dvh] overflow-y-auto rounded-t-[28px] bg-white px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {view === "login" && (
          <LoginForm
            onSwitch={() => setView("signup")}
            onForgot={() => setView("forgot")}
          />
        )}
        {view === "signup" && <SignupForm onSwitch={() => setView("login")} />}
        {view === "forgot" && <ForgotPasswordForm onBack={() => setView("login")} />}
      </div>
    </div>
  );
}
