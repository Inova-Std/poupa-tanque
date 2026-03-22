"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100">
      <div className="animate-pulse bg-zinc-200 w-full h-full" />
    </div>
  ),
});

export function MapLoader() {
  return <Map />;
}
