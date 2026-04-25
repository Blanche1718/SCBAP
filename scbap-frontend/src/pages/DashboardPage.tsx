/**
 * DASHBOARD SCBAP — Page d'accueil
 *
 * MODE ACTUEL : donnees fictives (mock)
 * Pour basculer sur l'API reelle, chercher les blocs marques :
 *   ── [MOCK] ──  →  desactiver
 *   ── [API]  ──  →  decommenter
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  MapPin,
  BarChart2,
  Bell,
  ArrowUpRight,
  Shield,
  Radio,
  ChevronRight,
  Wifi,
  Battery,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface StatutGlobal {
  totalBeneficiaires: number;
  actifs: number;
  aConfigurer: number;
  alertesCritiques: number;
  rapportsEnAttente: number;
  variationActifs: number;
}


interface EvenementTempsReel {
  id: string;
  beneficiaireCode: string;
  beneficiaireNom: string;
  message: string;
  heure: string;
  priorite: "CRITIQUE" | "MAINTENANCE" | "INFO";
}

interface PointCompliance {
  jour: string;
  taux: number;
}

interface PointComplianceTrend {
  jour: string;
  label: string;
  taux: number;
  total: number;
  valides: number;
}

interface JuridictionOption {
  id: string;
  nom: string;
}


// const MOCK_STATUT: StatutGlobal = {
//   totalActifs: 284,
//   nonConformes: 12,
//   termines: 147,
//   alertesCritiques: 5,
//   rapportsEnAttente: 8,
//   variationActifs: 6,
// };

// const MOCK_EVENEMENTS: EvenementTempsReel[] = [
//   {
//     id: "1",
//     beneficiaireCode: "BENE-00142",
//     beneficiaireNom: "Kokou A.",
//     message: "Violation de geofence detectee — zone de Cotonou Nord.",
//     heure: "14:22",
//     priorite: "CRITIQUE",
//   },
//   {
//     id: "2",
//     beneficiaireCode: "BENE-00089",
//     beneficiaireNom: "Fifame D.",
//     message: "Batterie du bracelet critique (< 5%). Connexion instable.",
//     heure: "13:58",
//     priorite: "MAINTENANCE",
//   },
//   {
//     id: "3",
//     beneficiaireCode: "BENE-00211",
//     beneficiaireNom: "Severin M.",
//     message: "Pointage effectue avec succes — Commissariat de Parakou.",
//     heure: "13:30",
//     priorite: "INFO",
//   },
//   {
//     id: "4",
//     beneficiaireCode: "BENE-00067",
//     beneficiaireNom: "Rachidath O.",
//     message: "Absence de pointage signalee. Delai depasse de 2h.",
//     heure: "12:45",
//     priorite: "CRITIQUE",
//   },
//   {
//     id: "5",
//     beneficiaireCode: "BENE-00310",
//     beneficiaireNom: "Systeme interne",
//     message: "Nouveau dossier beneficiaire enregistre et active.",
//     heure: "11:00",
//     priorite: "INFO",
//   },
// ];

// const MOCK_COMPLIANCE: PointCompliance[] = [
//   { jour: "LUN", taux: 91 },
//   { jour: "MAR", taux: 87 },
//   { jour: "MER", taux: 94 },
//   { jour: "JEU", taux: 88 },
//   { jour: "VEN", taux: 79 },
//   { jour: "SAM", taux: 83 },
//   { jour: "DIM", taux: 90 },
// ];

// ─────────────────────────────────────────────
// ── [API] HOOKS REELS — endpoints disponibles :
//   GET /dashboard/stats
//   GET /dashboard/events
//   GET /dashboard/compliance
// ─────────────────────────────────────────────

function buildDashboardQuery(juridiction?: string | null) {
  if (!juridiction) {
    return "";
  }

  return `?juridiction=${encodeURIComponent(juridiction)}`;
}

function useDashboardStats(juridiction?: string | null) {
  const [statut, setStatut] = useState<StatutGlobal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: StatutGlobal }>(`/dashboard/stats${buildDashboardQuery(juridiction)}`)
      .then((r) => setStatut(r.data))
      .finally(() => setLoading(false));
  }, [juridiction]);

  return { statut, loading };
}

function useEvenements(juridiction?: string | null) {
  const [evenements, setEvenements] = useState<EvenementTempsReel[]>([]);

  useEffect(() => {
    const fetchEvents = () => {
      api.get<{ data: EvenementTempsReel[] }>(`/dashboard/events${buildDashboardQuery(juridiction)}`)
        .then((r) => setEvenements(r.data))
        .catch((error) => console.error("Erreur lors du chargement des événements:", error));
    };

    // Premier chargement
    fetchEvents();

    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(fetchEvents, 30000);

    return () => clearInterval(interval);
  }, [juridiction]);

  return { evenements };
}

function useCompliance(juridiction?: string | null) {
  const [points, setPoints] = useState<PointCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: PointCompliance[] }>(`/dashboard/compliance${buildDashboardQuery(juridiction)}`)
      .then((r) => setPoints(r.data))
      .finally(() => setLoading(false));
  }, [juridiction]);

  return { points, loading };
}

function useComplianceTrend(juridiction?: string | null) {
  const [points, setPoints] = useState<PointComplianceTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: PointComplianceTrend[] }>(`/dashboard/compliance/trend${buildDashboardQuery(juridiction)}`)
      .then((r) => setPoints(r.data))
      .finally(() => setLoading(false));
  }, [juridiction]);

  return { points, loading };
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  variant = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  variant?: "default" | "alert" | "success";
  icon: React.ElementType;
}) {
  const iconBg = {
    default: "bg-surface-high text-primary",
    alert: "bg-error-container text-on-error-container",
    success: "bg-primary-fixed text-primary",
  }[variant];

  const valueCls = {
    default: "text-on-surface",
    alert: "text-on-error-container",
    success: "text-on-secondary-container",
  }[variant];

  return (
    <div className="rounded-lg bg-white p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className={`text-4xl sm:text-5xl font-bold leading-none ${valueCls}`}>{value}</p>
        {sub && (
          <p className={`text-xs mt-2 font-medium ${variant === "alert" ? "text-on-error-container" : "text-on-surface-variant"}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function useJurisdictions() {
  const [jurisdictions, setJurisdictions] = useState<JuridictionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.get<{ data: JuridictionOption[] }>("/juridictions")
      .then((r) => {
        if (active) {
          setJurisdictions(r.data);
        }
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des juridictions:", error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { jurisdictions, loading };
}

const PRIORITE_CONFIG = {
  CRITIQUE: {
    label: "PRIORITE HAUTE",
    color: "text-on-error-container",
    bar: "bg-on-error-container",
    bg: "bg-error-container",
    icon: AlertTriangle,
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    color: "text-amber-700",
    bar: "bg-amber-400",
    bg: "bg-amber-50",
    icon: Battery,
  },
  INFO: {
    label: "AVIS SYSTEME",
    color: "text-on-secondary-container",
    bar: "bg-primary-fixed",
    bg: "bg-surface-low",
    icon: Activity,
  },
};

function EvenementRow({ ev }: { ev: EvenementTempsReel }) {
  const cfg = PRIORITE_CONFIG[ev.priorite];
  const IconEv = cfg.icon;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-4 relative">
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${cfg.bar}`} />
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ml-3 ${cfg.bg}`}>
        <IconEv size={14} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface">
          {ev.beneficiaireCode}{" "}
          <span className="text-on-surface-variant font-medium">({ev.beneficiaireNom})</span>
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{ev.message}</p>
      </div>
      <div className="pl-11 sm:pl-0 sm:text-right shrink-0">
        <p className="text-xs font-mono text-on-surface-variant">{ev.heure}</p>
        <p className={`text-xs font-bold mt-1 ${cfg.color}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

function ComplianceChart({ points }: { points: PointCompliance[] }) {
  const max = Math.max(...points.map((p) => p.taux));
  const barHeights = [
    "h-[20px]",
    "h-[40px]",
    "h-[60px]",
    "h-[80px]",
    "h-[100px]",
    "h-[120px]",
  ];

  const getComplianceTone = (taux: number) => {
    if (taux < 70) {
      return {
        label: "text-on-error-container",
        bar: "#ffdad6",
      };
    }

    if (taux < 80) {
      return {
        label: "text-amber-700",
        bar: "#fcd34d",
      };
    }

    return {
      label: "text-primary",
      bar: "#c7eade",
    };
  };

  return (
    <div className="flex items-end justify-between gap-3 px-1 pt-2">
      {points.map((p) => {
        const ratio = max === 0 ? 0 : p.taux / max;
        const idx = Math.min(barHeights.length - 1, Math.round(ratio * (barHeights.length - 1)));
        const heightClass = barHeights[idx];
        const tone = getComplianceTone(p.taux);
        return (
          <div key={p.jour} className="flex flex-col items-center gap-2 flex-1">
            <span className={`text-[11px] font-bold ${tone.label}`}>
              {p.taux}%
            </span>
            <div className="w-full flex items-end h-30">
              <div
                className={`w-full rounded-sm transition-all ${heightClass}`}
                style={{ backgroundColor: tone.bar }}
              />
            </div>
            <span className="text-xs text-on-surface-variant font-medium">{p.jour}</span>
          </div>
        )
      })}
    </div>
  );
}

function getComplianceTone(taux: number) {
  if (taux < 70) {
  return {
    label: "text-on-error-container",
    bar: "#ffdad6",
    dot: "#93000a",
  };
  }

  if (taux < 80) {
  return {
    label: "text-amber-700",
    bar: "#fcd34d",
    dot: "#f59e0b",
  };
  }

  return {
    label: "text-primary",
    bar: "#c7eade",
    dot: "#17362e",
  };
}

function getComplianceSeverity(taux: number) {
  if (taux < 70) return 0;
  if (taux < 80) return 1;
  return 2;
}

function ComplianceTrendChart({ points }: { points: PointComplianceTrend[] }) {
  if (points.length === 0) {
    return null;
  }

  const width = 1000;
  const height = 260;
  const paddingX = 18;
  const paddingY = 26;
  const max = Math.max(100, ...points.map((p) => p.taux));
  const stepX = points.length === 1 ? 0 : (width - paddingX * 2) / (points.length - 1);

  const toX = (index: number) => paddingX + index * stepX;
  const toY = (value: number) => height - paddingY - ((height - paddingY * 2) * value) / max;

  const areaPoints = [
    `${paddingX},${height - paddingY}`,
    ...points.map((point, index) => `${toX(index)},${toY(point.taux)}`),
    `${width - paddingX},${height - paddingY}`,
  ].join(" ");
  const lineSegments = points.slice(1).map((point, index) => {
    const prev = points[index];
    const severity = Math.max(getComplianceSeverity(prev.taux), getComplianceSeverity(point.taux));

    return {
      x1: toX(index),
      y1: toY(prev.taux),
      x2: toX(index + 1),
      y2: toY(point.taux),
      stroke: severity === 0 ? "#d94841" : severity === 1 ? "#f59e0b" : "#17362e",
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <span className="font-medium">Derniers 30 jours</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Taux de réussite
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-low bg-surface-container-lowest">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-[260px]">
          <defs>
            <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c7eade" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#c7eade" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => {
            const y = toY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="#e6e9e8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={6}
                  y={y + 4}
                  className="fill-on-surface-variant"
                  style={{ fontSize: 10 }}
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill="url(#trendAreaFill)" />
          {lineSegments.map((segment, index) => (
            <line
              key={`${segment.x1}-${segment.x2}-${index}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              fill="none"
              stroke={segment.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.map((point, index) => {
            const tone = getComplianceTone(point.taux);
            return (
              <g key={point.label}>
                <circle
                  cx={toX(index)}
                  cy={toY(point.taux)}
                  r="5"
                  fill={tone.dot}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={toX(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-on-surface-variant"
                  style={{ fontSize: 10 }}
                >
                  {index % 5 === 0 || index === points.length - 1 ? point.jour : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] font-medium text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-on-error-container" />
          Rouge &lt; 70%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          Orange 70-79%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          Vert ≥ 80%
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const [heure, setHeure] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role?.nom === "ADMIN";
  const { jurisdictions, loading: jurisdictionsLoading } = useJurisdictions();

  // ── [API] Utilisation des vraies données ──
  const jurisdictionQuery = isAdmin ? selectedJurisdiction || null : null;
  const { statut, loading } = useDashboardStats(jurisdictionQuery);
  const { evenements } = useEvenements(jurisdictionQuery);
  const { points: weeklyCompliancePoints, loading: weeklyComplianceLoading } = useCompliance(jurisdictionQuery);
  const { points: complianceTrendPoints, loading: complianceTrendLoading } = useComplianceTrend(jurisdictionQuery);

  useEffect(() => {
    const t = setInterval(() => setHeure(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Rafraîchir les statistiques et la conformité
      await Promise.all([
        api.get<{ data: StatutGlobal }>(`/dashboard/stats${buildDashboardQuery(jurisdictionQuery)}`),
        api.get<{ data: PointCompliance[] }>(`/dashboard/compliance${buildDashboardQuery(jurisdictionQuery)}`),
        api.get<{ data: PointComplianceTrend[] }>(`/dashboard/compliance/trend${buildDashboardQuery(jurisdictionQuery)}`),
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const heureStr = heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = heure.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Activity size={19} className="text-primary" />
            Tableau de bord
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5 capitalize">
            {dateStr}
            {isAdmin && selectedJurisdiction ? (
              <span className="ml-2 font-semibold text-primary">
                · {jurisdictions.find((item) => item.id === selectedJurisdiction)?.nom ?? "Juridiction"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-sm font-mono text-on-surface-variant shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {heureStr}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-low text-on-secondary-container hover:bg-surface-high transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Actualiser
          </button>

          {isAdmin && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-white text-sm text-on-surface-variant">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Juridiction
              </span>
              <select
                value={selectedJurisdiction}
                onChange={(event) => setSelectedJurisdiction(event.target.value)}
                disabled={jurisdictionsLoading}
                className="bg-transparent text-sm font-medium text-on-surface outline-none min-w-[170px]"
              >
                <option value="">Toutes juridictions</option>
                {jurisdictions.map((juridiction) => (
                  <option key={juridiction.id} value={juridiction.id}>
                    {juridiction.nom}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-on-error-container bg-error-container hover:bg-error-container/80 transition-colors"
          >
            <Zap size={14} />
            ALERTE D'URGENCE
          </button>

          <div className="relative">
            <button
              aria-label="Notifications"
              className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors"
            >
              <Bell size={16} />
            </button>
            {(statut?.alertesCritiques ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-on-error-container text-white text-[10px] font-bold flex items-center justify-center">
                {statut?.alertesCritiques}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-linear-to-br from-primary to-[#2e4d44]">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-primary-fixed" />
          <div>
            <p className="text-white font-bold text-sm">Vue generale du systeme</p>
            <p className="text-white/55 text-xs mt-0.5">
              Surveillance de {statut?.totalBeneficiaires ?? "—"} bénéficiaires dans le système
              {isAdmin && selectedJurisdiction
                ? ` — ${jurisdictions.find((item) => item.id === selectedJurisdiction)?.nom ?? "Juridiction"}`
                : user?.structure?.juridiction
                  ? ` — ${user.structure.juridiction}`
                  : " — Benin"}
            </p>
          </div>
        </div>
        {/* <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <div className="text-left md:text-right">
            <p className="text-xs text-white/50 uppercase tracking-wider">Actifs</p>
            <p className="text-white font-bold text-lg leading-tight">
              {statut?.actifs ?? "—"} En suivi
            </p>
          </div>
          <div className="hidden md:block w-px h-8 bg-white/15" />
          <div className="text-left md:text-right">
            <p className="text-xs text-white/50 uppercase tracking-wider">À configurer</p>
            <p className="text-error-container font-bold text-lg leading-tight">
              {statut?.aConfigurer ?? "—"} En attente
            </p>
          </div>
        </div> */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total beneficiaires"
          value={statut?.totalBeneficiaires ?? "—"}
          // sub={`${formatVariation(statut?.variationActifs ?? 0)} depuis la derniere periode`}
          sub="Beneficiaires recensés dans le système"
          icon={Users}
          variant="default"
        />
        <KpiCard
          label="Actifs"
          value={statut?.actifs ?? "—"}
          sub="Profil confirme"
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          label="A configurer"
          value={statut?.aConfigurer ?? "—"}
          sub="Profil non confirme"
          icon={AlertTriangle}
          variant="alert"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 rounded-lg bg-white p-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-bold text-on-surface">
                  Tendance de conformité sur 30 jours
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Évolution quotidienne du taux de pointage validé
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Courbe de tendance
              </div>
            </div>

            {loading || complianceTrendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-outline-variant" />
              </div>
            ) : (
              <ComplianceTrendChart points={complianceTrendPoints} />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Répartition par jour
              </p>
              <span className="text-[11px] font-medium text-on-surface-variant">
                Semaine globale
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Lecture compacte du taux moyen par jour de semaine.
            </p>
            {weeklyComplianceLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-outline-variant" />
              </div>
            ) : (
              <ComplianceChart points={weeklyCompliancePoints} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              Execution rapide
            </p>
            <div className="space-y-2">
              <Link
                to="/rapports"
                className="flex items-center gap-3 p-3 rounded-md bg-surface-low hover:bg-surface-high transition-colors"
              >
                <div className="w-7 h-7 rounded bg-surface-high flex items-center justify-center">
                  <BarChart2 size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-on-surface text-xs font-semibold">Generer un rapport</p>
                  <p className="text-on-surface-variant text-xs">Bilan de conformite</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Synthèse du jour
              </p>
              <span className="text-[11px] font-medium text-on-surface-variant">
                Données en direct
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-low p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Actifs
                </p>
                <p className="text-lg font-bold text-primary leading-tight mt-1">
                  {statut?.actifs ?? "—"}
                </p>
              </div>
              <div className="rounded-md bg-surface-low p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  À configurer
                </p>
                <p className="text-lg font-bold text-on-error-container leading-tight mt-1">
                  {statut?.aConfigurer ?? "—"}
                </p>
              </div>
              <div className="rounded-md bg-surface-low p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Alertes critiques
                </p>
                <p className="text-lg font-bold text-on-error-container leading-tight mt-1">
                  {statut?.alertesCritiques ?? "—"}
                </p>
              </div>
              <div className="rounded-md bg-surface-low p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Rapports
                </p>
                <p className="text-lg font-bold text-on-surface leading-tight mt-1">
                  {statut?.rapportsEnAttente ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Visualiseur secteur
              </p>
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <Wifi size={11} />
                4 SIGNAUX EN DIRECT
              </span>
            </div>
            <div
              className="rounded-md h-24 flex items-center justify-center relative overflow-hidden bg-[linear-gradient(135deg,#0f2620_0%,#17362e_100%)]"
            >
              <MapPin size={20} className="text-primary-fixed z-10" />
              <div
                className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,#c7eade_10px,#c7eade_11px),repeating-linear-gradient(90deg,transparent,transparent_10px,#c7eade_10px,#c7eade_11px)]"
              />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <span className="text-[10px] font-bold text-primary-fixed/70 tracking-widest uppercase">
                  Suivi actif
                </span>
              </div>
            </div>
            <Link
              to="/surveillance"
              className="mt-2 flex items-center justify-between text-xs text-on-surface-variant hover:text-primary transition-colors font-medium"
            >
              <span>Ouvrir la carte complete</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="rounded-lg bg-primary-fixed p-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
              Briefing quotidien
            </p>
            <p className="text-xs text-primary leading-relaxed italic">
              "L'ordre est le fondement de la rehabilitation. Tous les agents doivent valider les controles nocturnes avant 22h00."
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Shield size={11} />
              PROTOCOLE VERIFIE
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Radio size={14} className="text-primary" />
            Renseignements en temps reel
          </h2>
          <Link
            to="/alertes"
            className="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-wider"
          >
            Voir tous les journaux
            <ChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-on-surface-variant">
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          <div className="divide-y divide-surface-low">
            {evenements.map((ev) => (
              <EvenementRow key={ev.id} ev={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
