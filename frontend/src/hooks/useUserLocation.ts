"use client";

import { useEffect, useState } from "react";

interface UserLocation {
  center: [number, number];
  zoom: number;
}

const FALLBACK: UserLocation = { center: [0, 20], zoom: 1.8 };
const STORAGE_KEY = "offroute-user-location";

let cached: UserLocation | null = null;

export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>(() => {
    if (cached) return cached;
    if (typeof window === "undefined") return FALLBACK;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserLocation;
        cached = parsed;
        return parsed;
      } catch {
        /* ignore */
      }
    }
    return FALLBACK;
  });

  useEffect(() => {
    if (cached && cached !== FALLBACK) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 5,
        };
        cached = loc;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        setLocation(loc);
      },
      () => {
        /* permission denied or error — keep fallback */
      },
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  return location;
}
