"use client";

import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { getMe, updateMe } from "@/lib/me";
import { supabase } from "@/lib/supabase";

interface ProfileValues {
  display_name: string;
  nationality: string;
}

interface PasswordValues {
  password: string;
  confirm: string;
}

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei",
  "Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde",
  "Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic",
  "East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany",
  "Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia",
  "Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
  "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique",
  "Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine",
  "Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia",
  "Saint Vincent and the Grenadines","Samoa","San Marino","São Tomé and Príncipe",
  "Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
  "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain",
  "Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan",
  "Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia",
  "Zimbabwe",
];

function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [natSearch, setNatSearch] = useState("");
  const [natOpen, setNatOpen] = useState(false);

  const profileForm = useForm<ProfileValues>({
    values: {
      display_name: me?.display_name ?? "",
      nationality: "",
    },
  });

  const pwForm = useForm<PasswordValues>();

  const profileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Profile saved");
      setShowProfile(false);
    },
    onError: () => toast.error("Could not save — try again"),
  });

  const pwMutation = useMutation({
    mutationFn: async (data: PasswordValues) => {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setShowPassword(false);
      pwForm.reset();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not update password"),
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function deleteAccount() {
    toast.error(
      "Account deletion requires backend admin endpoint — contact support"
    );
    setShowDeleteModal(false);
    setDeleteConfirm("");
  }

  const filteredCountries = natSearch
    ? COUNTRIES.filter((c) =>
        c.toLowerCase().includes(natSearch.toLowerCase())
      )
    : COUNTRIES;

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
          Settings
        </h1>
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
            onClick={() => {
              setShowProfile(!showProfile);
              setShowPassword(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/[0.08] active:bg-white/[0.1]"
          >
            <User size={20} className="text-zinc-400" />
            <span className="flex-1 text-left text-base text-white">
              Edit profile
            </span>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>

          <button
            onClick={() => {
              setShowPassword(!showPassword);
              setShowProfile(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/[0.08] active:bg-white/[0.1]"
          >
            <KeyRound size={20} className="text-zinc-400" />
            <span className="flex-1 text-left text-base text-white">
              Change password
            </span>
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        </div>

        {/* Profile edit (expandable) */}
        {showProfile && (
          <form
            onSubmit={profileForm.handleSubmit((data) =>
              profileMutation.mutate({
                display_name: data.display_name || undefined,
              })
            )}
            className="mt-4 flex flex-col gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.06]"
          >
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-zinc-400"
                htmlFor="display_name"
              >
                Display name
              </label>
              <input
                id="display_name"
                placeholder="How you appear to others"
                {...profileForm.register("display_name")}
                className="w-full rounded-xl bg-white/[0.08] px-4 py-3.5 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
              />
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                Nationality
              </label>
              <input
                type="text"
                placeholder="Search country…"
                value={natSearch || profileForm.watch("nationality")}
                onChange={(e) => {
                  setNatSearch(e.target.value);
                  setNatOpen(true);
                }}
                onFocus={() => setNatOpen(true)}
                className="w-full rounded-xl bg-white/[0.08] px-4 py-3.5 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
              />
              {natOpen && filteredCountries.length > 0 && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#111a2e] ring-1 ring-white/[0.12]">
                  {filteredCountries.slice(0, 30).map((country) => (
                    <button
                      type="button"
                      key={country}
                      onClick={() => {
                        profileForm.setValue("nationality", country);
                        setNatSearch("");
                        setNatOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/[0.06] active:bg-white/[0.1]"
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="rounded-xl bg-[#0f1d32] py-3.5 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
            >
              {profileMutation.isPending ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        {/* Password change (expandable) */}
        {showPassword && (
          <form
            onSubmit={pwForm.handleSubmit((data) => pwMutation.mutate(data))}
            className="mt-4 flex flex-col gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.06]"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                New password
              </label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                {...pwForm.register("password", {
                  required: "Required",
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
                className="w-full rounded-xl bg-white/[0.08] px-4 py-3.5 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
              />
              {pwForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {pwForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                Confirm password
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                {...pwForm.register("confirm", {
                  required: "Required",
                  validate: (val) =>
                    val === pwForm.watch("password") || "Passwords don't match",
                })}
                className="w-full rounded-xl bg-white/[0.08] px-4 py-3.5 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-blue-500/60"
              />
              {pwForm.formState.errors.confirm && (
                <p className="mt-1 text-sm text-red-400">
                  {pwForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={pwMutation.isPending}
              className="rounded-xl bg-[#0f1d32] py-3.5 text-base font-semibold text-white active:bg-[#162a46] disabled:opacity-50"
            >
              {pwMutation.isPending ? "Updating…" : "Update password"}
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

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-red-500 ring-1 ring-red-500/20 active:bg-red-500/[0.06]"
        >
          <Trash2 size={18} />
          Delete account
        </button>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setDeleteConfirm("");
            }
          }}
        >
          <div className="mx-5 w-full max-w-sm rounded-2xl bg-[#111a2e] p-6 ring-1 ring-white/[0.1]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] active:bg-white/[0.1]"
              >
                <X size={16} className="text-zinc-400" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-white">Delete account?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              This permanently deletes your account and all circuits. This
              action cannot be undone.
            </p>
            <label className="mb-1 mt-4 block text-sm text-zinc-500">
              Type <span className="font-mono text-red-400">DELETE</span> to
              confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full rounded-xl bg-white/[0.08] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none ring-1 ring-white/[0.12] focus:ring-red-500/60"
              placeholder="DELETE"
            />
            <button
              onClick={deleteAccount}
              disabled={deleteConfirm !== "DELETE"}
              className="mt-4 w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white disabled:opacity-30"
            >
              Permanently delete
            </button>
          </div>
        </div>
      )}
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
