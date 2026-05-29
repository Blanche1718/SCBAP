import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

type RequireRoleProps = {
  allowedRoles: string[];
  redirectTo?: string;
};

export function RequireRole({
  allowedRoles,
  redirectTo = "/dashboard",
}: RequireRoleProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Vérification des droits…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!allowedRoles.includes(user.role.nom)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
