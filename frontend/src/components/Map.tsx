"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
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

function createPinElement(m: MapMarker, active = false): HTMLElement {
  const cat = m.category ?? "other";
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
  const iconPaths = CATEGORY_ICON_SVG[cat] ?? CATEGORY_ICON_SVG.other;
  const size = active ? 48 : 42;
  const iconSize = active ? 22 : 18;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s;width:fit-content";

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

interface RouteConfig {
  dotMarkers: maplibregl.Marker[];
  color: string;
  width: number;
  opacity: number;
  dashed: boolean;
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
  const markerObjs = useRef<maplibregl.Marker[]>([]);
  const routeConfigs = useRef<RouteConfig[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, z?: number) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: z ?? 14, duration: 800 });
    },
  }));

  const redrawLines = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !svg.parentElement) return;

    const containerRect = svg.parentElement.getBoundingClientRect();
    svg.setAttribute("width", String(containerRect.width));
    svg.setAttribute("height", String(containerRect.height));

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    for (const route of routeConfigs.current) {
      if (route.dotMarkers.length < 2) continue;

      const points = route.dotMarkers.map((m) => {
        const el = m.getElement();
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - containerRect.left;
        const y = rect.top + rect.height / 2 - containerRect.top;
        return `${x},${y}`;
      });

      const outline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      outline.setAttribute("points", points.join(" "));
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", "#000000");
      outline.setAttribute("stroke-width", String(route.width + 2));
      outline.setAttribute("stroke-opacity", String(route.opacity * 0.25));
      outline.setAttribute("stroke-linecap", "round");
      outline.setAttribute("stroke-linejoin", "round");
      svg.appendChild(outline);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", points.join(" "));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", route.color);
      line.setAttribute("stroke-width", String(route.width));
      line.setAttribute("stroke-opacity", String(route.opacity));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      if (route.dashed) {
        line.setAttribute("stroke-dasharray", "8 6");
      }
      svg.appendChild(line);
    }
  }, []);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = [];
    markerEls.current.clear();

    routeConfigs.current.forEach((r) => r.dotMarkers.forEach((m) => m.remove()));
    routeConfigs.current = [];

    markers.forEach((m) => {
      const el = createPinElement(m);
      markerEls.current.set(m.id, el);
      if (onMarkerClick) {
        el.addEventListener("click", (e) => { e.stopPropagation(); onMarkerClick(m.id); });
      }
      const marker = new maplibregl.Marker({ element: el, draggable: m.draggable ?? false, anchor: "bottom" })
        .setLngLat([m.lng, m.lat])
        .addTo(map);
      if (m.draggable && onMarkerDragEnd) {
        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          onMarkerDragEnd(m.id, { lng: pos.lng, lat: pos.lat });
        });
      }
      markerObjs.current.push(marker);
    });

    if (drawRoute && markers.length > 1) {
      const dots = markers.map((m) => {
        const el = document.createElement("div");
        el.style.cssText = "width:1px;height:1px;opacity:0";
        return new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
      });
      routeConfigs.current.push({
        dotMarkers: dots,
        color: "#ffffff",
        width: 2.5,
        opacity: 0.85,
        dashed: false,
      });
    }

    if (circuitRoutes && circuitRoutes.length > 0) {
      for (const route of circuitRoutes) {
        if (route.coordinates.length < 2) continue;
        const dimmed = highlightCircuitId && highlightCircuitId !== route.id;
        const dots = route.coordinates.map((coord) => {
          const el = document.createElement("div");
          el.style.cssText = "width:1px;height:1px;opacity:0";
          return new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(coord)
            .addTo(map);
        });
        routeConfigs.current.push({
          dotMarkers: dots,
          color: route.color,
          width: 3,
          opacity: dimmed ? 0.15 : 0.85,
          dashed: true,
        });
      }
    }

    redrawLines();

    if (markers.length > 0) {
      const lngs = markers.map((m) => m.lng);
      const lats = markers.map((m) => m.lat);
      if (markers.length === 1) {
        map.flyTo({ center: [lngs[0], lats[0]], zoom: 14, duration: 800 });
      } else {
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, maxZoom: 15 }
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, drawRoute, circuitRoutes, highlightCircuitId, mapLoaded, redrawLines]);

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
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible";
      map.getCanvasContainer().appendChild(svg);
      svgRef.current = svg;

      setMapLoaded(true);

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
    });

    map.on("render", () => redrawLines());

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
      routeConfigs.current.forEach((r) => r.dotMarkers.forEach((m) => m.remove()));
      routeConfigs.current = [];
      markerEls.current.clear();
      mapRef.current = null;
      svgRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
});

export default Map;
