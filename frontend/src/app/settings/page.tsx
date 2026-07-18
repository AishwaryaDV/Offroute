"use client";

import { Bell, Check, ChevronRight, LogOut, Map, Shield, User, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { deleteMe, getMe, updateMe } from "@/lib/me";
import {
  isPushSupported,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { supabase } from "@/lib/supabase";

interface ProfileValues {
  username: string;
  display_name: string;
  nationality: string;
  profile_bio: string;
  profile_enabled: boolean;
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

type View = "menu" | "profile" | "account" | "mapstyle" | "notifications";

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

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported) {
      isSubscribedToPush().then(setPushEnabled);
    }
  }, []);

  async function togglePush() {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast.success("Push notifications disabled");
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          setPushEnabled(true);
          toast.success("Push notifications enabled");
        } else {
          toast.error("Notification permission denied");
        }
      }
    } catch {
      toast.error("Could not update push settings");
    } finally {
      setPushLoading(false);
    }
  }

  const profileForm = useForm<ProfileValues>({
    values: {
      username: me?.username ?? "",
      display_name: me?.display_name ?? "",
      nationality: me?.nationality ?? "",
      profile_bio: me?.profile_bio ?? "",
      profile_enabled: me?.profile_enabled ?? false,
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

  const permissionDenied =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";

  const cardOpen = view !== "menu";

  return (
    <div className="relative h-[100dvh]">
      {/* Background map */}
      <div className="pointer-events-none absolute inset-0">
        <MapDynamic center={[78.9629, 20.5937]} zoom={3.6} />
      </div>

      {/* Main sheet */}
      <div className="sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-hidden rounded-t-[28px] bg-white/85 backdrop-blur-2xl">
        {/* Settings menu — always visible behind cards */}
        <div className="flex h-full flex-col">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between px-5 pt-2 pb-4">
            <h1 className="text-4xl font-bold tracking-tight text-[#0f1d32]">
              Settings
            </h1>
            <button
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
              aria-label="Close"
            >
              <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-5">
            <button
              onClick={() => setView("profile")}
              className="flex w-full items-center gap-4 py-4 active:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f6f8]">
                <User size={20} className="text-[#0f1d32]" />
              </div>
              <span className="flex-1 text-left text-base font-semibold text-[#0f1d32]">
                Profile
              </span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => setView("account")}
              className="flex w-full items-center gap-4 py-4 active:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f6f8]">
                <Shield size={20} className="text-[#0f1d32]" />
              </div>
              <span className="flex-1 text-left text-base font-semibold text-[#0f1d32]">
                Account
              </span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => setView("mapstyle")}
              className="flex w-full items-center gap-4 py-4 active:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f6f8]">
                <Map size={20} className="text-[#0f1d32]" />
              </div>
              <span className="flex-1 text-left text-base font-semibold text-[#0f1d32]">
                Map style
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {MAP_STYLES.find((s) => s.url === mapStyle)?.label ?? "Satellite"}
                </span>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => setView("notifications")}
              className="flex w-full items-center gap-4 py-4 active:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f6f8]">
                <Bell size={20} className="text-[#0f1d32]" />
              </div>
              <span className="flex-1 text-left text-base font-semibold text-[#0f1d32]">
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {pushSupported && (
                  <span className="text-sm text-gray-400">
                    {pushEnabled ? "On" : "Off"}
                  </span>
                )}
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-4 py-4 active:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <LogOut size={20} className="text-red-500" />
              </div>
              <span className="flex-1 text-left text-base font-semibold text-red-500">
                Log out
              </span>
            </button>
          </div>

          <footer className="mt-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-center">
            <p className="text-xs text-gray-400">Offroute v1.0</p>
            <p className="mt-1 text-[10px] text-gray-300">
              &copy; {new Date().getFullYear()} &middot; Made with care for travelers
            </p>
          </footer>
        </div>

        {/* Dim overlay when card is open */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
            cardOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setView("menu")}
        />

        {/* Sub-view card — slides up from bottom */}
        <div
          className={`absolute inset-x-0 bottom-0 max-h-[50dvh] overflow-y-auto rounded-t-[20px] bg-white shadow-[0_-4px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
            cardOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="sticky top-0 z-10 bg-white pb-1 pt-3">
            <div className="flex justify-center">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
          </div>

          {/* Profile */}
          {view === "profile" && (
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between pt-2 pb-4">
                <h2 className="text-2xl font-bold text-[#0f1d32]">Profile</h2>
                <button
                  onClick={profileForm.handleSubmit((data) =>
                    profileMutation.mutate({
                      username: data.username || undefined,
                      display_name: data.display_name || undefined,
                      nationality: data.nationality || undefined,
                      profile_bio: data.profile_bio || undefined,
                      profile_enabled: data.profile_enabled,
                    })
                  )}
                  disabled={profileMutation.isPending}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1d32] active:bg-[#162a46] disabled:opacity-50"
                  aria-label="Save"
                >
                  <Check size={20} className="text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center gap-4 py-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f1d32]/10 text-lg font-bold text-[#0f1d32]">
                  {(me?.display_name?.[0] ?? me?.email[0] ?? "?").toUpperCase()}
                </div>
                <p className="text-sm text-gray-400">Profile photos coming soon</p>
              </div>

              <div className="mt-2">
                <div className="flex items-center gap-4 py-3">
                  <label htmlFor="username" className="w-24 shrink-0 text-sm text-gray-400">Username</label>
                  <input
                    id="username"
                    placeholder="your_username"
                    {...profileForm.register("username")}
                    className="flex-1 bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                  />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center gap-4 py-3">
                  <label htmlFor="display_name" className="w-24 shrink-0 text-sm text-gray-400">Name</label>
                  <input
                    id="display_name"
                    placeholder="Your name"
                    {...profileForm.register("display_name")}
                    className="flex-1 bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                  />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="relative flex items-center gap-4 py-3">
                  <label className="w-24 shrink-0 text-sm text-gray-400">Nationality</label>
                  <input
                    type="text"
                    placeholder="Search country"
                    value={natOpen ? natSearch : profileForm.watch("nationality")}
                    onChange={(e) => { setNatSearch(e.target.value); setNatOpen(true); }}
                    onFocus={() => { setNatSearch(""); setNatOpen(true); }}
                    className="flex-1 bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                  />
                  {natOpen && filteredCountries.length > 0 && (
                    <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {filteredCountries.slice(0, 20).map((country) => (
                        <button
                          type="button"
                          key={country}
                          onClick={() => {
                            profileForm.setValue("nationality", country);
                            setNatSearch("");
                            setNatOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#0f1d32] active:bg-gray-50"
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-start gap-4 py-3">
                  <label className="w-24 shrink-0 pt-1 text-sm text-gray-400">Bio</label>
                  <textarea
                    placeholder="A short bio"
                    rows={2}
                    maxLength={200}
                    {...profileForm.register("profile_bio")}
                    className="flex-1 resize-none bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                  />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-gray-400">Public profile</p>
                    <p className="text-[10px] text-gray-300">
                      {profileForm.watch("username")
                        ? `offroute.app/u/${profileForm.watch("username")}`
                        : "Set a username first"}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      {...profileForm.register("profile_enabled")}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0f1d32] peer-checked:after:translate-x-full" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Account */}
          {view === "account" && (
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between pt-2 pb-4">
                <h2 className="text-2xl font-bold text-[#0f1d32]">Account</h2>
                <button
                  onClick={saveAccount}
                  disabled={pwMutation.isPending}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1d32] active:bg-[#162a46] disabled:opacity-50"
                  aria-label="Save"
                >
                  <Check size={20} className="text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center gap-4 py-3">
                <span className="w-24 shrink-0 text-sm text-gray-400">Email</span>
                <span className="flex-1 truncate text-base font-medium text-[#0f1d32]">
                  {me?.email}
                </span>
              </div>
              <div className="h-px bg-gray-100" />

              <p className="pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Change password
              </p>
              <div className="py-3">
                <input
                  type="password"
                  placeholder="New password"
                  {...pwForm.register("password", {
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
                  className="w-full bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                />
                {pwForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-500">
                    {pwForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="h-px bg-gray-100" />
              <div className="py-3">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  {...pwForm.register("confirm", {
                    validate: (val) =>
                      val === pwForm.watch("password") || "Passwords don't match",
                  })}
                  className="w-full bg-transparent text-base font-medium text-[#0f1d32] placeholder-gray-300 outline-none"
                />
                {pwForm.formState.errors.confirm && (
                  <p className="mt-1 text-xs text-red-500">
                    {pwForm.formState.errors.confirm.message}
                  </p>
                )}
              </div>
              <div className="h-px bg-gray-100" />

              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-6 w-full rounded-full border border-gray-200 py-3 text-sm font-semibold text-red-500 active:bg-red-50"
              >
                Delete my account
              </button>
            </div>
          )}

          {/* Map style */}
          {view === "mapstyle" && (
            <div className="px-5 pb-6">
              <h2 className="pt-2 pb-1 text-2xl font-bold text-[#0f1d32]">Map style</h2>
              <p className="pb-5 text-sm text-gray-400">
                Choose your preferred map look.
              </p>
              <div className="grid grid-cols-2 gap-3">
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
                      <div className="h-16 w-full rounded-xl" style={{ backgroundColor: s.color }} />
                      <span className={`text-sm font-semibold ${isActive ? "text-blue-600" : "text-[#0f1d32]"}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="pt-4 text-center text-[10px] text-gray-400">
                Takes effect next time a map loads.
              </p>
            </div>
          )}

          {/* Notifications */}
          {view === "notifications" && (
            <div className="px-5 pb-6">
              <h2 className="pt-2 pb-1 text-2xl font-bold text-[#0f1d32]">Notifications</h2>
              <p className="pb-5 text-sm text-gray-400">
                Get notified when someone stars, clones, or invites you.
              </p>
              {pushSupported ? (
                <>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f6f8]">
                        <Bell size={20} className="text-[#0f1d32]" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-[#0f1d32]">Push notifications</p>
                        <p className="text-xs text-gray-400">{pushEnabled ? "Enabled" : "Disabled"}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={pushEnabled}
                        onChange={togglePush}
                        disabled={pushLoading || permissionDenied}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0f1d32] peer-checked:after:translate-x-full peer-disabled:opacity-50" />
                    </label>
                  </div>
                  {permissionDenied && (
                    <p className="pt-2 text-xs text-red-500">
                      Notifications are blocked by your browser. Update your site permissions to enable them.
                    </p>
                  )}
                </>
              ) : (
                <div className="py-6 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Push not supported on this browser.</p>
                </div>
              )}
            </div>
          )}
        </div>
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
            <h3 className="text-xl font-bold text-[#0f1d32]">Delete account?</h3>
            <p className="mt-2 text-base text-gray-500">
              This permanently deletes your account and all circuits. This action cannot be undone.
            </p>
            <label className="mb-1 mt-5 block text-sm text-gray-500">
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
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
              onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
              className="mt-2 w-full rounded-full py-3 text-base font-semibold text-gray-500 active:bg-gray-50"
            >
              Cancel
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
