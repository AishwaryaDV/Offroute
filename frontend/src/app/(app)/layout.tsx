import { AuthGuard } from "@/components/AuthGuard";

// Shared shell for all authenticated routes. AuthGuard lives here so it mounts
// once and does not re-run its check / re-fade on every navigation (the old
// per-page wrapping made tab switches feel abrupt).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
