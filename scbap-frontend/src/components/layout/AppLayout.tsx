import { NavLink, Outlet } from "react-router-dom";
import {
  Users,
  FileText,
  MapPin,
  Bell,
  BarChart2,
  Settings,
  LogOut,
  Radio,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: BarChart2, label: "Tableau de bord" },
  { to: "/dossiers", icon: FileText, label: "Dossiers" },
  { to: "/beneficiaires", icon: Users, label: "Bénéficiaires" },
  { to: "/pointages", icon: Radio, label: "Pointages" },
  { to: "/surveillance", icon: MapPin, label: "Surveillance GPS" },
  { to: "/alertes", icon: Bell, label: "Alertes" },
  { to: "/rapports", icon: BarChart2, label: "Rapports" },
];

const BOTTOM_NAV = [
  { to: "/administration", icon: Settings, label: "Administration" },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-64 shrink-0 h-full relative z-10 bg-[rgba(23,54,46,0.96)] backdrop-blur-[20px]">
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

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
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

          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
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
              AP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Agent Pénitentiaire</p>
              <p className="text-white/40 text-xs truncate">SPIP Cotonou</p>
            </div>
            <button className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
