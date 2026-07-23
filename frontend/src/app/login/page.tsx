"use client";

import { Compass, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Globe = dynamic(() => import("@/components/Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
    </div>
  ),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, one uppercase, one lowercase, one number, and one special character";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

interface LoginValues {
  email: string;
  password: string;
}

interface SignupValues {
  display_name: string;
  email: string;
  password: string;
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
          className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 pr-12 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
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
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
      <h2 className="mb-1 text-xl font-bold text-[#0f1d32]">Welcome back</h2>
      <p className="mb-5 text-sm text-gray-400">Log in to continue to Offroute</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            {...register("email", {
              required: "Email is required",
              pattern: { value: EMAIL_REGEX, message: "Enter a valid email" },
            })}
            className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.email
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
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
          className="self-end text-xs font-medium text-gray-400 active:text-gray-600"
        >
          Forgot password?
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[#0f1d32] py-3.5 text-sm font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex justify-center">
        <button
          onClick={signInWithGoogle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200 active:bg-gray-100"
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-gray-500">
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
    formState: { isSubmitting, errors },
  } = useForm<SignupValues>();

  async function signUpWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  }

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
      <h2 className="mb-1 text-xl font-bold text-[#0f1d32]">Create your account</h2>
      <p className="mb-5 text-sm text-gray-400">Start logging your travels on Offroute</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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
            className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.display_name
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.display_name && (
            <p className="mt-1 text-xs text-red-500">{errors.display_name.message}</p>
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
            className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
              errors.email
                ? "ring-red-400 focus:ring-red-500"
                : "ring-gray-200 focus:ring-blue-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
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
          <p className="mt-1 text-[10px] text-gray-400">{PASSWORD_HINT}</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 rounded-full bg-[#0f1d32] py-3.5 text-sm font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex justify-center">
        <button
          onClick={signUpWithGoogle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200 active:bg-gray-100"
          aria-label="Sign up with Google"
        >
          <GoogleIcon />
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-gray-500">
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
      <h2 className="mb-1 text-lg font-bold text-[#0f1d32]">Reset password</h2>
      <p className="mb-5 text-xs text-gray-500">
        {sent
          ? "Check your inbox for a reset link."
          : "Enter your email and we'll send you a reset link."}
      </p>

      {!sent && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: EMAIL_REGEX, message: "Enter a valid email" },
              })}
              className={`w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ${
                errors.email
                  ? "ring-red-400 focus:ring-red-500"
                  : "ring-gray-200 focus:ring-blue-500"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[#0f1d32] py-3.5 text-sm font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <button
        onClick={onBack}
        className="mt-4 w-full text-center text-xs font-semibold text-[#0f1d32] active:text-[#162a46]"
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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060d1b] text-white">
      {/* Star field + effects */}
      <div className="login-stars" />
      <div className="login-twinkle-1" />
      <div className="login-twinkle-2" />
      <div className="login-comet login-comet-1" />

      {/* Branding — top left */}
      <div className="relative z-10 flex items-center gap-2.5 px-6 pt-[max(env(safe-area-inset-top),2rem)]">
        <Compass size={22} className="text-white/80" />
        <span className="text-xl font-bold tracking-tight text-white/90">Offroute</span>
      </div>

      {/* Globe — center */}
      <div className="relative z-0 flex flex-1 items-center justify-center">
        <div className="login-globe-halo" />
        <div className="login-globe-wrapper">
          <Globe />
        </div>
      </div>

      {/* White sheet with form */}
      <div className="sheet-up sheet-light relative z-10 max-h-[55dvh] overflow-y-auto rounded-t-[28px] bg-white px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {view === "login" && (
          <LoginForm
            onSwitch={() => setView("signup")}
            onForgot={() => setView("forgot")}
          />
        )}
        {view === "signup" && <SignupForm onSwitch={() => setView("login")} />}
        {view === "forgot" && <ForgotPasswordForm onBack={() => setView("login")} />}
      </div>

      <style jsx>{`
        .login-stars {
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
            radial-gradient(1px 1px at 95% 60%, rgba(255,255,255,0.35), transparent);
        }
        .login-globe-wrapper {
          position: relative;
          width: min(300px, 72vw);
          height: min(300px, 72vw);
          z-index: 1;
          border-radius: 50%;
          overflow: hidden;
        }
        .login-globe-halo {
          position: absolute;
          width: min(440px, 105vw);
          height: min(440px, 105vw);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(56, 189, 248, 0.08) 30%,
            rgba(56, 189, 248, 0.18) 40%,
            rgba(56, 189, 248, 0.22) 45%,
            rgba(56, 189, 248, 0.12) 55%,
            rgba(56, 189, 248, 0.04) 65%,
            transparent 80%
          );
          z-index: 0;
        }
        .login-twinkle-1, .login-twinkle-2 {
          position: absolute;
          border-radius: 50%;
          background: white;
        }
        .login-twinkle-1 {
          width: 2.5px; height: 2.5px;
          top: 8%; left: 15%;
          animation: twinkle 2s ease-in-out infinite;
        }
        .login-twinkle-2 {
          width: 2px; height: 2px;
          top: 5%; right: 10%;
          animation: twinkle 2.5s ease-in-out 0.8s infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .login-comet {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 4px 1px rgba(255,255,255,0.6);
        }
        .login-comet::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 100%;
          width: 30px;
          height: 1px;
          background: linear-gradient(to left, rgba(255,255,255,0.6), transparent);
          transform: translateY(-50%);
        }
        .login-comet-1 {
          top: 12%; left: -10%;
          animation: comet-streak 7s linear 3s infinite;
        }
        @keyframes comet-streak {
          0% { transform: translate(-10%, 0); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(110vw, 15px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
