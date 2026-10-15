import { AuthGuard } from "@/components/AuthGuard";
import { PersistentMapBackground } from "@/components/PersistentMapBackground";

// Shared shell for all authenticated routes. AuthGuard lives here so it mounts
// once and does not re-run its check / re-fade on every navigation (the old
// per-page wrapping made tab switches feel abrupt). PersistentMapBackground is
// a sibling of {children} so the dashboard's backdrop map stays mounted across
// navigation instead of rebuilding each time.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PersistentMapBackground />
      {children}
    </AuthGuard>
  );
}
