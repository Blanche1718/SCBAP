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

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface StatutGlobal {
  totalActifs: number;
  nonConformes: number;
  termines: number;
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

// ─────────────────────────────────────────────
// ── [MOCK] DONNEES FICTIVES ──
// Commenter tout ce bloc quand l'API est prete
// ─────────────────────────────────────────────

const MOCK_STATUT: StatutGlobal = {
  totalActifs: 284,
  nonConformes: 12,
  termines: 147,
  alertesCritiques: 5,
  rapportsEnAttente: 8,
  variationActifs: 6,
};

const MOCK_EVENEMENTS: EvenementTempsReel[] = [
  {
    id: "1",
    beneficiaireCode: "BENE-00142",
    beneficiaireNom: "Kokou A.",
    message: "Violation de geofence detectee — zone de Cotonou Nord.",
    heure: "14:22",
    priorite: "CRITIQUE",
  },
  {
    id: "2",
    beneficiaireCode: "BENE-00089",
    beneficiaireNom: "Fifame D.",
    message: "Batterie du bracelet critique (< 5%). Connexion instable.",
    heure: "13:58",
    priorite: "MAINTENANCE",
  },
  {
    id: "3",
    beneficiaireCode: "BENE-00211",
    beneficiaireNom: "Severin M.",
    message: "Pointage effectue avec succes — Commissariat de Parakou.",
    heure: "13:30",
    priorite: "INFO",
  },
  {
    id: "4",
    beneficiaireCode: "BENE-00067",
    beneficiaireNom: "Rachidath O.",
    message: "Absence de pointage signalee. Delai depasse de 2h.",
    heure: "12:45",
    priorite: "CRITIQUE",
  },
  {
    id: "5",
    beneficiaireCode: "BENE-00310",
    beneficiaireNom: "Systeme interne",
    message: "Nouveau dossier beneficiaire enregistre et active.",
    heure: "11:00",
    priorite: "INFO",
  },
];

const MOCK_COMPLIANCE: PointCompliance[] = [
  { jour: "LUN", taux: 91 },
  { jour: "MAR", taux: 87 },
  { jour: "MER", taux: 94 },
  { jour: "JEU", taux: 88 },
  { jour: "VEN", taux: 79 },
  { jour: "SAM", taux: 83 },
  { jour: "DIM", taux: 90 },
];

// ─────────────────────────────────────────────
// ── [API] HOOKS REELS — decommenter quand les
// endpoints suivants seront disponibles :
//   GET /api/dashboard/stats
//   GET /api/dashboard/events
//   GET /api/dashboard/compliance
// ─────────────────────────────────────────────

/*
import { api } from "../lib/api";

function useDashboardStats() {
  const [statut, setStatut] = useState<StatutGlobal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: StatutGlobal }>("/api/dashboard/stats")
      .then((r) => setStatut(r.data))
      .finally(() => setLoading(false));
  }, []);

  return { statut, loading };
}

function useEvenements() {
  const [evenements, setEvenements] = useState<EvenementTempsReel[]>([]);

  useEffect(() => {
    api.get<{ data: EvenementTempsReel[] }>("/api/dashboard/events")
      .then((r) => setEvenements(r.data));
  }, []);

  return { evenements };
}

function useCompliance() {
  const [points, setPoints] = useState<PointCompliance[]>([]);

  useEffect(() => {
    api.get<{ data: PointCompliance[] }>("/api/dashboard/compliance")
      .then((r) => setPoints(r.data));
  }, []);

  return { points };
}
*/

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
    <div className="rounded-lg bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className={`text-5xl font-bold leading-none ${valueCls}`}>{value}</p>
        {sub && (
          <p className={`text-xs mt-2 font-medium ${variant === "alert" ? "text-on-error-container" : "text-on-surface-variant"}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
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
    <div className="flex items-start gap-4 py-4 relative">
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
      <div className="text-right shrink-0">
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

  return (
    <div className="flex items-end justify-between gap-3 px-1 pt-2">
      {points.map((p) => {
        const ratio = max === 0 ? 0 : p.taux / max;
        const idx = Math.min(barHeights.length - 1, Math.round(ratio * (barHeights.length - 1)));
        const heightClass = barHeights[idx];
        const isLow = p.taux < 85;
        return (
          <div key={p.jour} className="flex flex-col items-center gap-2 flex-1">
            <span className={`text-[11px] font-bold ${isLow ? "text-on-error-container" : "text-primary"}`}>
              {p.taux}%
            </span>
            <div className="w-full flex items-end h-30">
              <div
                className={`w-full rounded-sm transition-all ${heightClass} ${isLow ? "bg-error-container" : "bg-primary-fixed"}`}
              />
            </div>
            <span className="text-xs text-on-surface-variant font-medium">{p.jour}</span>
          </div>
        )
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const [heure, setHeure] = useState(new Date());

  // ── [MOCK] etat local avec donnees fictives ──
  const statut = MOCK_STATUT;
  const evenements = MOCK_EVENEMENTS;
  const compliancePoints = MOCK_COMPLIANCE;
  const loading = false;

  // ── [API] Remplacer le bloc ci-dessus par : ──
  /*
  const { statut, loading } = useDashboardStats();
  const { evenements } = useEvenements();
  const { points: compliancePoints } = useCompliance();
  */

  useEffect(() => {
    const t = setInterval(() => setHeure(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const heureStr = heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = heure.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-8 min-h-full bg-surface">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Activity size={19} className="text-primary" />
            Tableau de bord
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5 capitalize">{dateStr}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-sm font-mono text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {heureStr}
          </div>

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

      <div className="rounded-lg p-5 mb-6 flex items-center justify-between bg-linear-to-br from-primary to-[#2e4d44]">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-primary-fixed" />
          <div>
            <p className="text-white font-bold text-sm">Vue generale du systeme</p>
            <p className="text-white/55 text-xs mt-0.5">
              Surveillance de {statut?.totalActifs ?? "—"} profils judiciaires actifs — Benin
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase tracking-wider">Risques actifs</p>
            <p className="text-error-container font-bold text-lg leading-tight">
              {statut?.nonConformes ?? "—"} Critiques
            </p>
          </div>
          <div className="w-px h-8 bg-white/15" />
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase tracking-wider">Rapports en attente</p>
            <p className="text-white font-bold text-lg leading-tight">
              {String(statut?.rapportsEnAttente ?? "—").padStart(2, "0")} En cours
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total actifs"
          value={statut?.totalActifs ?? "—"}
          sub={`+${statut?.variationActifs ?? 0} depuis la derniere periode`}
          icon={Users}
          variant="default"
        />
        <KpiCard
          label="Non conformes"
          value={statut?.nonConformes ?? "—"}
          sub="Action immediate requise"
          icon={AlertTriangle}
          variant="alert"
        />
        <KpiCard
          label="Termines"
          value={statut?.termines ?? "—"}
          sub="Traitement archive"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 rounded-lg bg-white p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-on-surface">
                Tendances de conformite hebdomadaires
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Pourcentage de pointages reussis par jour
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Taux de succes
            </div>
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-outline-variant" />
            </div>
          ) : (
            <ComplianceChart points={compliancePoints} />
          )}
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
