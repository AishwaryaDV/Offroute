"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  "https://tiles.stadiamaps.com/styles/alidade_smooth.json";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
}

export interface MapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  drawRoute?: boolean;
  interactive?: boolean;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
}

export default function Map({
  className = "h-64 w-full",
  center = [72.8777, 19.076],
  zoom = 12,
  markers = [],
  drawRoute = false,
  interactive = true,
  onMapClick,
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

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    if (interactive) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        "bottom-right"
      );
    }

    if (onMapClick) {
      map.on("click", (e) => onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    }

    mapRef.current = map;

    map.on("load", () => {
      markers.forEach((m) => {
        const el = document.createElement("div");
        el.style.cssText =
          "width:28px;height:28px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3)";
        el.textContent = m.label ?? "";
        new maplibregl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
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
            "line-color": "#000",
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

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
