"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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
    });

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      let animFrame: number;
      const speed = 0.04;

      function rotate() {
        const center = map.getCenter();
        center.lng += speed;
        map.setCenter(center);
        animFrame = requestAnimationFrame(rotate);
      }

      animFrame = requestAnimationFrame(rotate);
      map.once("remove", () => cancelAnimationFrame(animFrame));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="globe-map-container h-full w-full overflow-hidden rounded-full"
    />
  );
}
