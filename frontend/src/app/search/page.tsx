"use client";

import { MapPin, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUserLocation } from "@/hooks/useUserLocation";
import { AuthGuard } from "@/components/AuthGuard";
import MapDynamic from "@/components/MapDynamic";
import { StepLoader } from "@/components/StepLoader";
import { searchAll } from "@/lib/search";
import type { PointCategory } from "@/types/api";

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

function CategoryDot({ category }: { category: PointCategory | null }) {
  const color = CATEGORY_COLORS[category ?? "other"] ?? CATEGORY_COLORS.other;
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: color }}
    />
  );
}

function SearchPage() {
  const router = useRouter();
  const userGeo = useUserLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const circuits = data?.circuits ?? [];
  const points = data?.points ?? [];
  const hasResults = circuits.length > 0 || points.length > 0;
  const searched = debouncedQuery.length > 0 && !isLoading;

  return (
    <div className="relative h-[100dvh]">
      <div className="pointer-events-none absolute inset-0">
        <MapDynamic center={userGeo.center} zoom={userGeo.zoom} />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      </div>

      <div className="sheet-up sheet-light absolute inset-x-0 bottom-0 top-[6dvh] overflow-y-auto rounded-t-[28px] bg-white">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <h1 className="flex-1 text-4xl font-bold tracking-tight text-[#0f1d32]">
            Search
          </h1>
          <button
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f6f8] active:bg-gray-200"
            aria-label="Close"
          >
            <X size={22} className="text-[#0f1d32]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pb-5">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search circuits and points..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl bg-[#f5f6f8] py-3.5 pl-10 pr-10 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-gray-200/80 transition-shadow focus:ring-2 focus:ring-[#0f1d32]/30 focus:bg-white"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 active:bg-gray-300"
                aria-label="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-10">
          {/* Loading */}
          {isLoading && debouncedQuery.length > 0 && (
            <div className="flex justify-center py-16">
              <StepLoader variant="light" />
            </div>
          )}

          {/* Empty state — no query */}
          {!debouncedQuery && (
            <div className="flex flex-col items-center pt-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
                <Search size={28} className="text-gray-300" />
              </div>
              <p className="mt-4 text-base font-semibold text-[#0f1d32]">
                Find your places
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Search across your circuits and points
              </p>
            </div>
          )}

          {/* No results */}
          {searched && !hasResults && (
            <div className="flex flex-col items-center pt-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f6f8]">
                <MapPin size={28} className="text-gray-300" />
              </div>
              <p className="mt-4 text-base font-semibold text-[#0f1d32]">
                No results
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Nothing matched &ldquo;{debouncedQuery}&rdquo;
              </p>
            </div>
          )}

          {/* Results */}
          {searched && hasResults && (
            <div className="flex flex-col gap-6">
              {/* Circuits section */}
              {circuits.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Circuits ({circuits.length})
                  </h2>
                  <div className="flex flex-col gap-2">
                    {circuits.map((c) => (
                      <Link
                        key={c.id}
                        href={`/circuits/${c.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-[#f5f6f8] px-4 py-3.5 active:bg-gray-200"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f1d32]/10">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="#0f1d32"
                          >
                            <rect
                              x="3"
                              y="3"
                              width="7"
                              height="7"
                              rx="1.5"
                            />
                            <rect
                              x="14"
                              y="3"
                              width="7"
                              height="7"
                              rx="1.5"
                            />
                            <rect
                              x="3"
                              y="14"
                              width="7"
                              height="7"
                              rx="1.5"
                            />
                            <rect
                              x="14"
                              y="14"
                              width="7"
                              height="7"
                              rx="1.5"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0f1d32]">
                            {c.title}
                          </p>
                          {c.description && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {c.description}
                            </p>
                          )}
                        </div>
                        {c.tags && c.tags.length > 0 && (
                          <span className="shrink-0 rounded-full bg-[#0f1d32]/8 px-2 py-0.5 text-[10px] font-medium text-[#0f1d32]/60">
                            {c.tags[0]}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Points section */}
              {points.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Points ({points.length})
                  </h2>
                  <div className="flex flex-col gap-2">
                    {points.map((p) => (
                      <Link
                        key={p.id}
                        href={`/circuits/${p.circuit_id}`}
                        className="flex items-center gap-3 rounded-2xl bg-[#f5f6f8] px-4 py-3.5 active:bg-gray-200"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200">
                          <MapPin size={18} className="text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0f1d32]">
                            {p.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                            {p.category && (
                              <>
                                <CategoryDot category={p.category} />
                                <span className="capitalize">
                                  {p.category.replace("_", " ")}
                                </span>
                                <span>·</span>
                              </>
                            )}
                            <span className="truncate">
                              {p.circuit_title}
                            </span>
                          </p>
                        </div>
                        {p.rating && (
                          <span className="shrink-0 text-xs font-bold text-amber-500">
                            {"★".repeat(p.rating)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <AuthGuard>
      <SearchPage />
    </AuthGuard>
  );
}
