import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component ensures that authenticated users are redirected 
 * away from public-only pages (like Login or Signup) to the dashboard.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  // If the user is already authenticated, redirect them to the dashboard
  if (user) {
    return <Navigate to="/today" replace />;
  }

  // Otherwise, allow them to view the public page
  return <>{children}</>;
}
