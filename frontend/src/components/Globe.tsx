"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 6,
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
          },
        ],
      },
      center: [20, 20],
      zoom: 1.5,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: true,
    });

    map.on("idle", () => setReady(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full overflow-hidden rounded-full">
      <div
        ref={containerRef}
        className={`globe-scroll-strip ${ready ? "globe-scroll-animate" : ""}`}
      />
      <style jsx>{`
        .globe-scroll-strip {
          width: 300%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .globe-scroll-animate {
          opacity: 1;
          animation: globe-scroll 20s linear infinite;
        }
        @keyframes globe-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
