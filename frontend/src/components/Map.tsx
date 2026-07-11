"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "/map-style-satellite.json";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  draggable?: boolean;
}

export interface MapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  drawRoute?: boolean;
  interactive?: boolean;
  userLocation?: { lng: number; lat: number };
  onReady?: () => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMarkerDragEnd?: (id: string, lngLat: { lng: number; lat: number }) => void;
}

export default function Map({
  className = "h-64 w-full",
  center = [72.8777, 19.076],
  zoom = 12,
  markers = [],
  drawRoute = false,
  interactive = true,
  userLocation,
  onReady,
  onMapClick,
  onMarkerDragEnd,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom,
      interactive,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
    });

    if (onMapClick) {
      map.on("click", (e) =>
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      );
    }

    mapRef.current = map;

    map.on("load", () => {
      // User location pulsing dot
      if (userLocation) {
        const dot = document.createElement("div");
        dot.style.cssText =
          "position:relative;width:22px;height:22px;cursor:default";
        const pulse = document.createElement("div");
        pulse.style.cssText =
          "position:absolute;inset:-9px;border-radius:50%;background:rgba(66,133,244,0.18);animation:loc-pulse 2s ease-out infinite";
        const core = document.createElement("div");
        core.style.cssText =
          "position:absolute;inset:0;border-radius:50%;background:#4285f4;border:2.5px solid #fff;box-shadow:0 0 6px rgba(66,133,244,0.5)";
        dot.appendChild(pulse);
        dot.appendChild(core);
        new maplibregl.Marker({ element: dot })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);
      }

      // Circuit/point markers
      markers.forEach((m) => {
        const el = document.createElement("div");
        el.style.cssText = m.draggable
          ? "width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 12px rgba(59,130,246,.5);cursor:grab;border:2px solid rgba(255,255,255,.8)"
          : "width:28px;height:28px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(59,130,246,.4);border:2px solid rgba(255,255,255,.6)";
        el.textContent = m.label ?? "";
        const marker = new maplibregl.Marker({
          element: el,
          draggable: m.draggable ?? false,
        })
          .setLngLat([m.lng, m.lat])
          .addTo(map);

        if (m.draggable && onMarkerDragEnd) {
          marker.on("dragend", () => {
            const pos = marker.getLngLat();
            onMarkerDragEnd(m.id, { lng: pos.lng, lat: pos.lat });
          });
        }
      });

      if (drawRoute && markers.length > 1) {
        const coords = markers.map((m) => [m.lng, m.lat]);
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2.5,
            "line-dasharray": [2, 2],
          },
        });
      }

      if (markers.length > 0) {
        const lngs = markers.map((m) => m.lng);
        const lats = markers.map((m) => m.lat);
        if (markers.length === 1) {
          map.setCenter([lngs[0], lats[0]]);
          map.setZoom(14);
        } else {
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60, maxZoom: 15 }
          );
        }
      }
    });

    if (onReady) {
      // `idle` can fire before every visible tile has landed — only signal
      // ready once the tile set is actually complete, so loaders don't
      // reveal half-rendered quadrants.
      const signalReady = () => {
        if (map.areTilesLoaded()) {
          map.off("idle", signalReady);
          onReady();
        }
      };
      map.on("idle", signalReady);
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
