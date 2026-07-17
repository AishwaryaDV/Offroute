"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Me",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
  },
  {
    href: "/circuits",
    label: "Circuits",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.5 5a1 1 0 0 1 1 1v3.586l2.207 2.207a1 1 0 0 1-1.414 1.414l-2.5-2.5A1 1 0 0 1 10.5 12V8a1 1 0 0 1 1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav className="flex items-center justify-around rounded-full bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
                active ? "text-[#0f1d32]" : "text-[#0f1d32]/40"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
