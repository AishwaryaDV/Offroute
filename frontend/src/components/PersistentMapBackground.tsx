"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import { useUserLocation } from "@/hooks/useUserLocation";

// The dashboard's full-screen satellite backdrop, hoisted into the (app) layout
// so it stays mounted across navigation. Returning to the dashboard no longer
// rebuilds the map or re-fetches tiles — it's just revealed again. Kept mounted
// but hidden on other routes (visibility, not unmount, so re-entry is instant).
export function PersistentMapBackground() {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";

  const userGeo = useUserLocation();
  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(null);
  const [mapReady, setMapReady] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("offroute-map-loaded") === "1",
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  return (
    <div
      aria-hidden={!onDashboard}
      className={`fixed inset-0 z-0 ${onDashboard ? "" : "invisible pointer-events-none"}`}
    >
      <MapDynamic
        className="absolute inset-0 h-full w-full"
        center={userGeo.center}
        zoom={Math.min(userGeo.zoom, 3)}
        interactive={onDashboard}
        userLocation={userLoc ?? undefined}
        onReady={() => {
          setMapReady(true);
          sessionStorage.setItem("offroute-map-loaded", "1");
        }}
      />
      <div
        className={`absolute inset-0 z-[1] flex items-center justify-center bg-black/40 backdrop-blur-xl transition-opacity duration-700 ${
          mapReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <StepLoader variant="dark" />
      </div>
    </div>
  );
}
