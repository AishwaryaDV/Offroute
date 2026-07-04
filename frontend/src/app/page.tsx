"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
          Offroute
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          API status:{" "}
          <span
            className={
              apiStatus === "ok" ? "text-green-500" : "text-yellow-500"
            }
          >
            {apiStatus}
          </span>
        </p>
      </main>
    </div>
  );
}
