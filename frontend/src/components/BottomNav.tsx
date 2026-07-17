"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Account",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
  },
  {
    href: "/circuits",
    label: "Circuits",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.5 5a1 1 0 0 1 1 1v3.586l2.207 2.207a1 1 0 0 1-1.414 1.414l-2.5-2.5A1 1 0 0 1 10.5 12V8a1 1 0 0 1 1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.68 7.68 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.614 7.614 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-stretch gap-2.5 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Main 4 nav items */}
      <nav className="flex flex-1 items-center justify-around rounded-full bg-white/95 px-2 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/circuits" && pathname.startsWith("/circuits"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 transition-colors ${
                active
                  ? "bg-[#0f1d32]/8 text-[#0f1d32]"
                  : "text-[#0f1d32]/35"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Separated search icon — matches navbar height via items-stretch */}
      <button
        disabled
        className="flex aspect-square shrink-0 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-xl text-[#0f1d32]/25"
        aria-label="Search (coming soon)"
      >
        <Search size={22} />
      </button>
    </div>
  );
}
