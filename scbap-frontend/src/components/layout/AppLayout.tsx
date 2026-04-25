import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Users,
  FileText,
  MapPin,
  Bell,
  BarChart2,
  Settings,
  LogOut,
  Radio,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role.nom === "ADMIN";
  const navItems = [
    { to: "/dashboard", icon: BarChart2, label: "Tableau de bord" },
    ...(isAdmin ? [{ to: "/dossiers", icon: FileText, label: "Dossiers" }] : []),
    { to: "/beneficiaires", icon: Users, label: "Bénéficiaires" },
    { to: "/pointages", icon: Radio, label: "Pointages" },
    { to: "/surveillance", icon: MapPin, label: "Surveillance GPS" },
    { to: "/alertes", icon: Bell, label: "Alertes" },
    { to: "/rapports", icon: BarChart2, label: "Rapports" },
  ];
  const bottomNavItems = isAdmin
    ? [{ to: "/administration", icon: Settings, label: "Administration" }]
    : [{ to: "/configuration", icon: Settings, label: "Configuration" }];

  // Ferme la sidebar mobile lors du changement de route
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Overlay mobile (Backdrop) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 shrink-0 h-full bg-[rgba(23,54,46,0.96)] backdrop-blur-[20px] transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo zone */}
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
             {/* <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #c7eade 0%, #2e4d44 100%)",
              }}
            >
              <Shield size={16} color="#17362e" />
            </div> */}
            <img src="/logo.png" alt="SCBAP Logo" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-white font-bold text-sm tracking-wide leading-none">SCBAP</p>
              <p className="text-white/40 text-xs mt-0.5 font-medium tracking-wider uppercase">
                Bénin
              </p>
            </div>
          </div>
        </div>

        {/* Bouton de fermeture (mobile uniquement) */}
        <button
          title="Fermer la barre latérale"
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X size={20} />
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white/80 hover:bg-white/8"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${isActive ? "text-primary-fixed" : "text-white/40 group-hover:text-white/60"}`}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-primary-fixed" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          <div className="my-4 border-t border-white/8" />

          {bottomNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80 hover:bg-white/8"
                }`
              }
            >
              <Icon size={16} className="shrink-0 text-white/40" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User zone */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-primary text-primary-fixed">
              {(user?.prenom?.[0] ?? "A") + (user?.nom?.[0] ?? "P")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user ? `${user.prenom} ${user.nom}` : "Agent Pénitentiaire"}
              </p>
              <p className="text-white/40 text-xs truncate">
                {user ? `${user.role.nom} • ${user.structure.nom}` : "SPIP Cotonou"}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 transition-all hover:border-error/40 hover:bg-error/15 hover:text-white"
              title="Se déconnecter"
              onClick={logout}
            >
              <LogOut size={13} />
              <span>Quitter</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile avec bouton menu */}
        <header className="flex md:hidden items-center justify-between h-16 px-4 bg-white border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SCBAP" className="w-8 h-8 object-contain" />
            <span className="font-bold text-primary tracking-tight">SCBAP</span>
          </div>
          <button
            title="Ouvrir la barre latérale"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-on-surface-variant hover:bg-surface-low rounded-md"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
