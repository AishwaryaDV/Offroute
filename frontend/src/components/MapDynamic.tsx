import dynamic from "next/dynamic";
import type { MapProps, MapMarker, MapHandle } from "./Map";

const MapDynamic = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b1120]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
    </div>
  ),
});

export default MapDynamic;
export type { MapProps, MapMarker, MapHandle };
