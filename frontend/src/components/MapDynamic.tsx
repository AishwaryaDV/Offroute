import dynamic from "next/dynamic";
import type { MapProps, MapMarker, MapHandle, CircuitRoute } from "./Map";

const MapDynamic = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default MapDynamic;
export type { MapProps, MapMarker, MapHandle, CircuitRoute };
