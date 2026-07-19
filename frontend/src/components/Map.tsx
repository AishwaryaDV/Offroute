"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const DEFAULT_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "/map-style-satellite.json";

const STYLE_KEY = "offroute-map-style";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  category?: string;
  draggable?: boolean;
}

export interface MapHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

export interface CircuitRoute {
  id: string;
  color: string;
  coordinates: [number, number][];
}

export interface MapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  activeMarkerId?: string;
  drawRoute?: boolean;
  circuitRoutes?: CircuitRoute[];
  highlightCircuitId?: string;
  interactive?: boolean;
  userLocation?: { lng: number; lat: number };
  onReady?: () => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMarkerDragEnd?: (id: string, lngLat: { lng: number; lat: number }) => void;
  onMarkerClick?: (id: string) => void;
  onMapInit?: (handle: MapHandle) => void;
}

const CATEGORY_ICON_SVG: Record<string, string> = {
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  drink: '<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/>',
  stay: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  viewpoint: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  activity: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  nature: '<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  culture: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2-8 5h16z"/>',
  hidden_gem: '<path d="M6 3h12l4 6-10 13L2 9z"/>',
  other: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#ef4444",
  drink: "#f59e0b",
  stay: "#8b5cf6",
  viewpoint: "#10b981",
  activity: "#f97316",
  nature: "#22c55e",
  culture: "#6366f1",
  hidden_gem: "#ec4899",
  other: "#3b82f6",
};

function bezierRoute(pts: [number, number][]): [number, number][] {
  if (pts.length < 2) return pts;
  const out: [number, number][] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    const off = len * 0.15;
    const sign = i % 2 === 0 ? 1 : -1;
    const cx = (x1 + x2) / 2 + sign * (-dy / len) * off;
    const cy = (y1 + y2) / 2 + sign * (dx / len) * off;
    const steps = 24;
    for (let t = 1; t <= steps; t++) {
      const s = t / steps;
      const u = 1 - s;
      out.push([u * u * x1 + 2 * u * s * cx + s * s * x2, u * u * y1 + 2 * u * s * cy + s * s * y2]);
    }
  }
  return out;
}

function createPinElement(m: MapMarker, active = false): HTMLElement {
  const cat = m.category ?? "other";
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
  const iconPaths = CATEGORY_ICON_SVG[cat] ?? CATEGORY_ICON_SVG.other;
  const size = active ? 48 : 42;
  const iconSize = active ? 22 : 18;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s";

  const circle = document.createElement("div");
  circle.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.35);border:2.5px solid ${color};transition:all 0.2s`;
  circle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</svg>`;
  wrapper.appendChild(circle);

  const tail = document.createElement("div");
  tail.style.cssText = `width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};margin-top:-2px`;
  wrapper.appendChild(tail);

  if (m.label) {
    const badge = document.createElement("div");
    badge.style.cssText =
      "position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:10px;background:#0f1d32;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)";
    badge.textContent = m.label;
    wrapper.appendChild(badge);
  }

  wrapper.style.position = "relative";
  return wrapper;
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
  {
    className = "h-64 w-full",
    center = [72.8777, 19.076],
    zoom = 12,
    markers = [],
    activeMarkerId,
    drawRoute = false,
    circuitRoutes,
    highlightCircuitId,
    interactive = true,
    userLocation,
    onReady,
    onMapClick,
    onMarkerDragEnd,
    onMarkerClick,
    onMapInit,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerEls = useRef<globalThis.Map<string, HTMLElement>>(new globalThis.Map());
  const routeDataRef = useRef<[number, number][] | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, z?: number) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: z ?? 14, duration: 800 });
    },
  }));

  useEffect(() => {
    markerEls.current.forEach((el, id) => {
      const isActive = id === activeMarkerId;
      el.style.transform = isActive ? "scale(1.15)" : "scale(1)";
      el.style.zIndex = isActive ? "10" : "1";
      el.style.filter = isActive
        ? "drop-shadow(0 0 6px rgba(255,255,255,0.5))"
        : "none";
    });
  }, [activeMarkerId]);

  function addRouteToMap(map: maplibregl.Map, coords: [number, number][]) {
    if (map.getSource("route")) {
      (map.getSource("route") as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      });
      return;
    }
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      },
    });
    map.addLayer({
      id: "route-outline",
      type: "line",
      source: "route",
      paint: { "line-color": "#000000", "line-width": 5, "line-opacity": 0.25 },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: { "line-color": "#ffffff", "line-width": 2.5, "line-opacity": 0.85 },
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const savedStyle = localStorage.getItem(STYLE_KEY) ?? DEFAULT_STYLE;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: savedStyle,
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

    if (onMapInit) {
      onMapInit({
        flyTo: (lng: number, lat: number, z?: number) => {
          map.flyTo({ center: [lng, lat], zoom: z ?? 14, duration: 800 });
        },
      });
    }

    map.on("load", () => {
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

      markers.forEach((m) => {
        const el = createPinElement(m);
        markerEls.current.set(m.id, el);

        if (onMarkerClick) {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onMarkerClick(m.id);
          });
        }

        const marker = new maplibregl.Marker({
          element: el,
          draggable: m.draggable ?? false,
          anchor: "bottom",
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
        const raw = markers.map((m) => [m.lng, m.lat] as [number, number]);
        const coords = bezierRoute(raw);
        routeDataRef.current = coords;
        addRouteToMap(map, coords);
      }

      if (circuitRoutes && circuitRoutes.length > 0) {
        circuitRoutes.forEach((route) => {
          if (route.coordinates.length < 2) return;
          const coords = bezierRoute(route.coordinates);
          const srcId = `circuit-route-${route.id}`;
          const dimmed = highlightCircuitId && highlightCircuitId !== route.id;
          map.addSource(srcId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: coords },
            },
          });
          map.addLayer({
            id: `${srcId}-outline`,
            type: "line",
            source: srcId,
            paint: {
              "line-color": "#000000",
              "line-width": 4,
              "line-opacity": dimmed ? 0.05 : 0.2,
            },
          });
          map.addLayer({
            id: `${srcId}-line`,
            type: "line",
            source: srcId,
            paint: {
              "line-color": route.color,
              "line-width": 2.5,
              "line-opacity": dimmed ? 0.15 : 0.8,
              "line-dasharray": [4, 3],
            },
          });
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
            { padding: 80, maxZoom: 15 }
          );
        }
      }
    });

    if (onReady) {
      const signalReady = () => {
        if (map.areTilesLoaded()) {
          map.off("idle", signalReady);
          onReady();
        }
      };
      map.on("idle", signalReady);
    }

    return () => {
      markerEls.current.clear();
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
});

export default Map;
