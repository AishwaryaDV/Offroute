"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/health";

export default function Home() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  const apiStatus = isPending
    ? "checking..."
    : isError
      ? "unreachable"
      : data.status;
  const dbStatus = isPending ? "checking..." : isError ? "unknown" : data.database;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
          Offroute
        </h1>
        <div className="flex flex-col gap-2 text-lg text-zinc-600 dark:text-zinc-400">
          <p>
            API:{" "}
            <span className={apiStatus === "ok" ? "text-green-500" : "text-yellow-500"}>
              {apiStatus}
            </span>
          </p>
          <p>
            Database:{" "}
            <span className={dbStatus === "ok" ? "text-green-500" : "text-yellow-500"}>
              {dbStatus}
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
