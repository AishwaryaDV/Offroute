import { useEffect, useState } from "react";

const CACHE_PREFIX = "unsplash-cover:";
const ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

export function useUnsplashCover(
  title: string | undefined,
  hasCover: boolean,
): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (hasCover || !title) return null;
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CACHE_PREFIX + title) ?? null;
  });

  useEffect(() => {
    if (hasCover || !title || !ACCESS_KEY) return;

    const cached = localStorage.getItem(CACHE_PREFIX + title);
    if (cached) {
      setUrl(cached);
      return;
    }

    const query = title.split(/\s+/).slice(0, 3).join(" ");

    let cancelled = false;
    fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + " travel")}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } },
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const imgUrl = data.results?.[0]?.urls?.small as string | undefined;
        if (imgUrl) {
          localStorage.setItem(CACHE_PREFIX + title, imgUrl);
          setUrl(imgUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [title, hasCover]);

  return url;
}
