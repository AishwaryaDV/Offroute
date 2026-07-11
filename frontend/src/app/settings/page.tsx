"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { deleteMe, getMe, updateMe } from "@/lib/me";
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

const MAP_STYLE_KEY = "offroute-map-style";
const MAP_STYLES = [
  { id: "satellite", url: "/map-style-satellite.json", label: "Satellite", color: "#2d5a27" },
  { id: "streets", url: "/map-style-streets.json", label: "Streets", color: "#e2d8c3" },
  { id: "dark", url: "/map-style-dark.json", label: "Dark", color: "#1a1a2e" },
  { id: "terrain", url: "/map-style-terrain.json", label: "Terrain", color: "#7a9e6b" },
];

type View = "menu" | "profile" | "account" | "mapstyle";

function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [view, setView] = useState<View>("menu");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [natSearch, setNatSearch] = useState("");
  const [natOpen, setNatOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(MAP_STYLE_KEY) ?? "/map-style-satellite.json"
      : "/map-style-satellite.json"
  );

  const profileForm = useForm<ProfileValues>({
    values: {
      display_name: me?.display_name ?? "",
      nationality: me?.nationality ?? "",
    },
  });

  const pwForm = useForm<PasswordValues>();

  const profileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Profile saved");
      setView("menu");
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
      pwForm.reset();
      setView("menu");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Could not update password"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMe,
    onSuccess: async () => {
      await supabase.auth.signOut();
      queryClient.clear();
      toast.success("Account deleted");
      router.replace("/login");
    },
    onError: () => toast.error("Could not delete account — try again"),
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function saveAccount() {
    const password = pwForm.getValues("password");
    if (!password) {
      // Leave blank if you don't want to change it
      setView("menu");
      return;
    }
    pwForm.handleSubmit((data) => pwMutation.mutate(data))();
  }

  const filteredCountries = natSearch
    ? COUNTRIES.filter((c) =>
        c.toLowerCase().includes(natSearch.toLowerCase())
      )
    : COUNTRIES;

  /* ---------- Menu (Settings root) ---------- */
  if (view === "menu") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
        <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
        <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-[#f5f6f8]">
        <div className="flex justify-end px-5 pt-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:bg-gray-100"
            aria-label="Close"
          >
            <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
          </button>
        </div>

        <h1 className="px-5 pb-6 pt-2 text-4xl font-bold tracking-tight text-[#0f1d32]">
          Settings
        </h1>

        <div className="bg-white">
          <button
            onClick={() => setView("profile")}
            className="flex w-full items-center justify-between px-5 py-5 active:bg-gray-50"
          >
            <span className="text-lg font-semibold text-[#0f1d32]">
              Profile
            </span>
            <ChevronRight size={20} className="text-blue-500" />
          </button>
          <div className="mx-5 h-px bg-gray-200" />
          <button
            onClick={() => setView("account")}
            className="flex w-full items-center justify-between px-5 py-5 active:bg-gray-50"
          >
            <span className="text-lg font-semibold text-[#0f1d32]">
              Account
            </span>
            <ChevronRight size={20} className="text-blue-500" />
          </button>
          <div className="mx-5 h-px bg-gray-200" />
          <button
            onClick={() => setView("mapstyle")}
            className="flex w-full items-center justify-between px-5 py-5 active:bg-gray-50"
          >
            <span className="text-lg font-semibold text-[#0f1d32]">
              Map style
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {MAP_STYLES.find((s) => s.url === mapStyle)?.label ?? "Satellite"}
              </span>
              <ChevronRight size={20} className="text-blue-500" />
            </div>
          </button>
          <div className="mx-5 h-px bg-gray-200" />
          <div className="flex w-full items-center justify-between px-5 py-5 opacity-40">
            <span className="text-lg font-semibold text-[#0f1d32]">
              Notifications
            </span>
            <span className="text-sm text-gray-500">Coming soon</span>
          </div>
        </div>

        <div className="mt-6 bg-white">
          <button
            onClick={logout}
            className="flex w-full items-center px-5 py-5 active:bg-gray-50"
          >
            <span className="text-lg font-semibold text-[#0f1d32]">
              Log out
            </span>
          </button>
        </div>
        </div>
      </div>
    );
  }

  /* ---------- Profile edit ---------- */
  if (view === "profile") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
        <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
        <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <button
            onClick={() => setView("menu")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
            aria-label="Back"
          >
            <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
          </button>
          <button
            onClick={profileForm.handleSubmit((data) =>
              profileMutation.mutate({
                display_name: data.display_name || undefined,
                nationality: data.nationality || undefined,
              })
            )}
            disabled={profileMutation.isPending}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f1d32] active:bg-[#162a46] disabled:opacity-50"
            aria-label="Save"
          >
            <Check size={22} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        <h1 className="px-5 pb-6 pt-4 text-4xl font-bold tracking-tight text-[#0f1d32]">
          Profile
        </h1>

        <div className="flex items-center gap-5 px-5 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f1d32]/10 text-2xl font-bold text-[#0f1d32]">
            {(me?.display_name?.[0] ?? me?.email[0] ?? "?").toUpperCase()}
          </div>
          <p className="text-lg font-semibold text-gray-400">
            Profile photos coming soon
          </p>
        </div>

        <div className="border-t border-gray-200">
          <div className="flex items-center gap-4 px-5 py-4">
            <label
              htmlFor="display_name"
              className="w-28 shrink-0 text-base text-gray-400"
            >
              Name
            </label>
            <input
              id="display_name"
              placeholder="Your name"
              {...profileForm.register("display_name")}
              className="flex-1 bg-transparent text-lg font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
            />
          </div>
          <div className="mx-5 h-px bg-gray-200" />
          <div className="relative flex items-center gap-4 px-5 py-4">
            <label className="w-28 shrink-0 text-base text-gray-400">
              Nationality
            </label>
            <input
              type="text"
              placeholder="Search country"
              value={natOpen ? natSearch : profileForm.watch("nationality")}
              onChange={(e) => {
                setNatSearch(e.target.value);
                setNatOpen(true);
              }}
              onFocus={() => {
                setNatSearch("");
                setNatOpen(true);
              }}
              className="flex-1 bg-transparent text-lg font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
            />
            {natOpen && filteredCountries.length > 0 && (
              <div className="absolute inset-x-5 top-full z-20 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {filteredCountries.slice(0, 30).map((country) => (
                  <button
                    type="button"
                    key={country}
                    onClick={() => {
                      profileForm.setValue("nationality", country);
                      setNatSearch("");
                      setNatOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-base text-[#0f1d32] active:bg-gray-50"
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mx-5 h-px bg-gray-200" />
        </div>
        </div>
      </div>
    );
  }

  /* ---------- Map style ---------- */
  if (view === "mapstyle") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
        <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
        <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <button
              onClick={() => setView("menu")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
              aria-label="Back"
            >
              <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
            </button>
          </div>

          <h1 className="px-5 pb-2 pt-4 text-4xl font-bold tracking-tight text-[#0f1d32]">
            Map style
          </h1>
          <p className="px-5 pb-6 text-base text-gray-400">
            Choose your preferred map look across the app.
          </p>

          <div className="grid grid-cols-2 gap-4 px-5">
            {MAP_STYLES.map((s) => {
              const isActive = mapStyle === s.url;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setMapStyle(s.url);
                    localStorage.setItem(MAP_STYLE_KEY, s.url);
                    toast.success(`Map style set to ${s.label}`);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                    isActive
                      ? "bg-blue-50 ring-2 ring-blue-500"
                      : "bg-[#f5f6f8] ring-1 ring-gray-200 active:bg-gray-100"
                  }`}
                >
                  <div
                    className="h-20 w-full rounded-xl"
                    style={{ backgroundColor: s.color }}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? "text-blue-600" : "text-[#0f1d32]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="px-5 pt-6 text-center text-xs text-gray-400">
            Takes effect next time a map loads.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Account ---------- */
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b1120]">
      <div className="h-[max(env(safe-area-inset-top),2.75rem)] shrink-0" />
      <div className="sheet-up sheet-light flex-1 overflow-hidden rounded-t-[28px] bg-[#f5f6f8]">
      <div className="flex items-center justify-between rounded-t-[28px] bg-white px-5 pb-2 pt-5">
        <button
          onClick={() => setView("menu")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
          aria-label="Back"
        >
          <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-bold text-[#0f1d32]">Account</h1>
        <button
          onClick={saveAccount}
          disabled={pwMutation.isPending}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f1d32] active:bg-[#162a46] disabled:opacity-50"
          aria-label="Save"
        >
          <Check size={22} className="text-white" strokeWidth={2.5} />
        </button>
      </div>

      <div className="bg-white">
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="w-28 shrink-0 text-base text-gray-400">Email</span>
          <span className="flex-1 truncate text-lg font-medium text-[#0f1d32]">
            {me?.email}
          </span>
        </div>
      </div>

      <div className="px-5 pb-2 pt-8">
        <p className="text-base font-semibold text-gray-500">
          Change password
        </p>
        <p className="text-sm text-gray-400">
          (Leave blank if you don&apos;t want to change it)
        </p>
      </div>

      <div className="bg-white">
        <div className="px-5 py-4">
          <input
            type="password"
            placeholder="New password"
            {...pwForm.register("password", {
              minLength: { value: 6, message: "At least 6 characters" },
            })}
            className="w-full bg-transparent text-lg font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
          />
          {pwForm.formState.errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {pwForm.formState.errors.password.message}
            </p>
          )}
        </div>
        <div className="mx-5 h-px bg-gray-200" />
        <div className="px-5 py-4">
          <input
            type="password"
            placeholder="New password (again)"
            {...pwForm.register("confirm", {
              validate: (val) =>
                val === pwForm.watch("password") || "Passwords don't match",
            })}
            className="w-full bg-transparent text-lg font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
          />
          {pwForm.formState.errors.confirm && (
            <p className="mt-1 text-sm text-red-500">
              {pwForm.formState.errors.confirm.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-16 flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="rounded-full border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-[#0f1d32] active:bg-gray-50"
        >
          Delete my account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setDeleteConfirm("");
            }
          }}
        >
          <div className="mx-5 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#0f1d32]">
              Delete account?
            </h3>
            <p className="mt-2 text-base text-gray-500">
              This permanently deletes your account and all circuits. This
              action cannot be undone.
            </p>
            <label className="mb-1 mt-5 block text-sm text-gray-500">
              Type <span className="font-mono font-bold text-red-500">DELETE</span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#f5f6f8] px-4 py-3 text-base text-[#0f1d32] outline-none focus:border-red-400"
              placeholder="DELETE"
            />
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteConfirm !== "DELETE" || deleteMutation.isPending}
              className="mt-4 w-full rounded-full bg-red-600 py-3.5 text-base font-semibold text-white disabled:opacity-30"
            >
              {deleteMutation.isPending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm("");
              }}
              className="mt-2 w-full rounded-full py-3 text-base font-semibold text-gray-500 active:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      </div>
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
