import dynamic from "next/dynamic";
import type { MapProps, MapMarker } from "./Map";

const MapDynamic = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <p className="text-sm text-zinc-400">Loading map…</p>
    </div>
  ),
});

export default MapDynamic;
export type { MapProps, MapMarker };
