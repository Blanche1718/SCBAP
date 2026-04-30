import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getStoredAuthToken } from "../../auth/authStorage";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { useAlertesSurveillance } from "../../hooks/useAlertesSurveillance";
import { ALL_PAGE_SIZE, getPageSizeOptions } from "../../utils/pagination";
import { formatInAppTimeZone } from "../../utils/timezone";
import type { AlerteSurveillance } from "../../types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Search,
  Users,
  XCircle,
  CircleAlert,
  ArrowRight,
  X,
} from "lucide-react";

type JuridictionOption = {
  id: string;
  nom: string;
};

type WebSocketMessage =
  | { type: "snapshot"; payload: unknown }
  | { type: "telemetry"; payload: unknown }
  | { type: "alert"; payload: unknown }
  | { type: string; payload: unknown };

const ALERT_TYPES = [
  "SORTIE_ZONE",
  "BATTERIE_FAIBLE",
  "RETRAIT_BRACELET",
  "DECONNEXION_PROLONGEE",
  "TAMPERING",
];

const WS_URL =
  import.meta.env.VITE_SURVEILLANCE_WS_URL?.trim() ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "ws://localhost:3000/ws/surveillance"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/surveillance`);

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return formatInAppTimeZone(parsed, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAgo(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff) || diff < 0) return "à l’instant";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function alertIcon(alert: AlerteSurveillance) {
  if (alert.niveau === "CRITIQUE") return AlertTriangle;
  if (alert.statut === "TRAITEE") return CheckCircle2;
  if (alert.statut === "IGNOREE") return XCircle;
  return CircleAlert;
}

function getSeverity(alert: AlerteSurveillance) {
  if (alert.niveau === "CRITIQUE") return "CRITIQUE";
  return "MOYEN";
}

function getStatusDisplay(alert: AlerteSurveillance) {
  if (alert.statut === "TRAITEE") return "Traitée";
  if (alert.statut === "IGNOREE") return "Ignorée";
  return "Non traitée";
}

function getStatusTone(alert: AlerteSurveillance) {
  if (alert.statut === "TRAITEE") return "bg-[#d3e3de] text-[#576662]";
  if (alert.statut === "IGNOREE") return "bg-[#e1e3e2] text-[#717975]";
  return "bg-[#ffe6e6] text-[#b71c1c]";
}

function getAlertBadge(alert: AlerteSurveillance) {
  const normalized = alert.type.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return (normalized.slice(0, 2) || "AL").padEnd(2, "A");
}

function buildWsUrl() {
  const token = getStoredAuthToken();

  if (!token) {
    return WS_URL;
  }

  const url = new URL(WS_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export default function AlertesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role.nom === "ADMIN";
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [niveauFilter, setNiveauFilter] = useState<"TOUS" | "CRITIQUE" | "NORMALE">("TOUS");
  const [statutFilter, setStatutFilter] = useState<"TOUS" | "OUVERTE" | "TRAITEE" | "IGNOREE">("TOUS");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [juridictions, setJuridictions] = useState<JuridictionOption[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search,
      type: typeFilter,
      niveau: niveauFilter === "TOUS" ? "" : niveauFilter,
      statut: statutFilter === "TOUS" ? "" : statutFilter,
      juridiction: isAdmin ? jurisdictionFilter : undefined,
    }),
    [isAdmin, jurisdictionFilter, niveauFilter, search, statutFilter, typeFilter],
  );

  const { alertes, meta, loading, error, refetch } = useAlertesSurveillance(page, limit, filters);

  useEffect(() => {
    const targetAlertId = searchParams.get("alerte")?.trim() || null;

    if (targetAlertId) {
      const matched = alertes.find((item) => item.id === targetAlertId);
      if (matched) {
        setSelectedAlertId(matched.id);
        return;
      }
    }

    if (!selectedAlertId && alertes.length > 0) {
      setSelectedAlertId(alertes[0].id);
    }
  }, [alertes, searchParams, selectedAlertId]);

  useEffect(() => {
    if (!isAdmin) return;

    api.get<{ data: JuridictionOption[] }>("/juridictions")
      .then((response) => setJuridictions(response.data))
      .catch(() => setJuridictions([]));
  }, [isAdmin]);

  useEffect(() => {
    const ws = new WebSocket(buildWsUrl());

    ws.onopen = () => {};
    ws.onclose = () => {};
    ws.onerror = () => {};
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        if (message.type === "alert") {
          void refetch();
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, [refetch]);

  const selectedAlert = selectedAlertId
    ? alertes.find((item) => item.id === selectedAlertId) ?? alertes[0] ?? null
    : alertes[0] ?? null;

  const summary = meta.summary;
  const totalPages = meta.totalPages || 1;

  const recentAlerts = alertes.slice(0, 5);

  const getBeneficiaryName = (alert: AlerteSurveillance) =>
    `${alert.beneficiaire?.dossier?.prenom ?? ""} ${alert.beneficiaire?.dossier?.nom ?? ""}`.trim() ||
    "Bénéficiaire inconnu";

  const selectedSeverity = selectedAlert ? getSeverity(selectedAlert) : null;

  function goToPreviousPage() {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }

  function goToNextPage() {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div className="min-h-full bg-[#f8faf9] px-3 py-3 text-[#191c1c] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-8 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ffdad6] px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#93000a]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#93000a]" />
                  Active Surveillance Alerts
                </div>
                <h1 className="font-[Manrope] text-[32px] font-extrabold leading-tight text-[#17362e] sm:text-[42px]">
                  Alertes de surveillance
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-medium text-[#414845]">
                  Surveillance judiciaire en temps réel des bénéficiaires sous bracelet électronique. Interventions requises prioritaires.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#414845]">
                  <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary?.traiteesAujourdHui ?? 0} traitées aujourd’hui</span>
                  <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary?.beneficiairesTouches ?? 0} membres touchés</span>
                </div>
              </div>
              <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#d3e3de] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#17362e]">Non traitées</p>
                      <p className="font-[Manrope] text-[28px] font-black leading-none text-[#191c1c]">{summary?.ouvertes ?? 0}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6e9e8] text-[#17362e]">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-[#ffcccc] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#b71c1c]">Critiques</p>
                      <p className="font-[Manrope] text-[28px] font-black leading-none text-[#191c1c]">{summary?.critiques ?? 0}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff9999] text-[#b71c1c]">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* ── Search ── */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
              <input
                type="text"
                placeholder="Rechercher par alerte ou numéro de dossier…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-md bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
              />
            </div>
            <p className="mb-5 text-xs text-on-secondary-container">
              La recherche s&apos;applique aux alertes chargées sur la page en cours.
            </p>

            {/* ── Filters ── */}
            <div className="rounded-lg bg-white p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Type d&apos;alerte
                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value);
                      setPage(1);
                    }}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tous les types</option>
                    {ALERT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Niveau
                  <select
                    value={niveauFilter}
                    onChange={(event) => {
                      setNiveauFilter(event.target.value as "TOUS" | "CRITIQUE" | "NORMALE");
                      setPage(1);
                    }}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TOUS">Tous</option>
                    <option value="CRITIQUE">Critique</option>
                    <option value="NORMALE">Moyen</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Statut
                  <select
                    value={statutFilter}
                    onChange={(event) => {
                      setStatutFilter(event.target.value as "TOUS" | "OUVERTE" | "TRAITEE" | "IGNOREE");
                      setPage(1);
                    }}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TOUS">Tous</option>
                    <option value="OUVERTE">Non traitée</option>
                    <option value="TRAITEE">Traitée</option>
                    <option value="IGNOREE">Ignorée</option>
                  </select>
                </label>

                {isAdmin && (
                  <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                    Juridictions
                    <select
                      value={jurisdictionFilter}
                      onChange={(event) => {
                        setJurisdictionFilter(event.target.value);
                        setPage(1);
                      }}
                      className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Toutes juridictions</option>
                      {juridictions.map((juridiction) => (
                        <option key={juridiction.id} value={juridiction.id}>
                          {juridiction.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter("");
                      setNiveauFilter("TOUS");
                      setStatutFilter("TOUS");
                      setJurisdictionFilter("");
                      setPage(1);
                      void refetch();
                    }}
                    className="w-full rounded-md bg-surface-high px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2e4d44] hover:bg-[#d9dddb] transition-colors"
                  >
                    Effacer filtres
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <CompactPaginationControls
                  page={page}
                  totalPages={meta.totalPages}
                  loading={loading}
                  onPrevious={goToPreviousPage}
                  onNext={goToNextPage}
                  buttonClassName="h-10 w-10 rounded-xl border border-[#e1e3e2] bg-[#f8faf9] text-[#414845] hover:bg-[#e6e9e8] disabled:cursor-not-allowed disabled:opacity-40"
                  labelClassName="min-w-[100px] text-center text-xs font-semibold text-[#414845]"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-[#ffdad6] bg-white px-4 py-3 text-sm text-[#93000a] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
                {error}
              </div>
            )}

            <div className="md:hidden space-y-3">
              {loading && <div className="rounded-2xl bg-white px-4 py-10 text-sm text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">Chargement des alertes...</div>}

              {!loading && alertes.length === 0 && (
                <div className="rounded-2xl bg-white px-4 py-10 text-sm text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
                  Aucune alerte ne correspond aux filtres actuels.
                </div>
              )}

              {alertes.map((alert) => {
                const selected = selectedAlert?.id === alert.id;
                const severity = getSeverity(alert);
                const alertBadge = getAlertBadge(alert);
                const name = getBeneficiaryName(alert);
                const isCritical = severity === "CRITIQUE";
                const borderTone = isCritical ? "border-l-[#93000a]" : "border-l-[#e65100]";
                const titleTone = "text-[#b71c1c]";
                const severityChip = isCritical ? "bg-[#ffcccc] text-[#b71c1c]" : "bg-[#fff3e0] text-[#e65100]";
                const statusChip = getStatusTone(alert);

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      setSelectedAlertId(alert.id);
                      setDrawerOpen(true);
                    }}
                    className={`w-full rounded-lg border border-transparent bg-white p-4 text-left shadow-[0_6px_18px_rgba(23,54,46,0.04)] transition hover:bg-[#f8faf9] ${selected ? "ring-1 ring-[#17362e]/10" : ""} ${borderTone}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ffebee] font-black text-[11px] text-[#b71c1c]">
                        {alertBadge}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className={`truncate font-[Manrope] text-[15px] font-extrabold uppercase tracking-tight ${titleTone}`}>{alert.type}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-[#191c1c]">{alert.message}</p>
                          </div>
                          <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${severityChip}`}>{severity}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#414845]">
                          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-bold uppercase tracking-[0.22em] ${statusChip}`}>
                            <span className={`h-2 w-2 rounded-full ${alert.statut === "TRAITEE" ? "bg-[#576662]" : alert.statut === "IGNOREE" ? "bg-[#717975]" : "bg-[#93000a]"}`} />
                            {getStatusDisplay(alert)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={11} />
                            il y a {formatAgo(alert.declencheeLe)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={11} />
                            {name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block">
              {loading && <div className="rounded-lg bg-white px-5 py-10 text-sm text-on-surface-variant">Chargement des alertes...</div>}

              {!loading && alertes.length === 0 && (
                <div className="rounded-lg bg-white px-5 py-10 text-sm text-on-surface-variant text-center">
                  Aucune alerte ne correspond aux filtres actuels.
                </div>
              )}

              {!loading && alertes.length > 0 && (
                <div className="space-y-1.5">
                  {/* Table Header */}
                  <div className={`w-full grid grid-cols-[40px_2fr_1.5fr_1.5fr_1.5fr_1.5fr_1fr] items-center gap-4 px-5 py-4 rounded-lg bg-[#f2f4f3] border border-[#e1e3e2]`}>
                    <div className="flex items-center justify-center">
                      <AlertTriangle size={14} className="text-[#d61111]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#d61111]">Type d&apos;alerte</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <CircleAlert size={14} className="text-[#d61111]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest  text-[#d61111]">Niveau</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} className="text-[#d61111]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#d61111]">Statut</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock3 size={14} className="text-[#d61111]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#d61111]">Temps</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Users size={14} className="text-[#d61111]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#d61111]">Bénéficiaire</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <ArrowRight size={14} className="text-[#d61111]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#d61111]">Actions</span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  {alertes.map((alert) => {
                    const severity = getSeverity(alert);
                    const name = getBeneficiaryName(alert);
                    const isCritical = severity === "CRITIQUE";

                    // Coloring for alert type
                    let typeColor = "bg-[#fff3e0] text-[#e65100]";
                    if (isCritical) typeColor = "bg-[#ffcccc] text-[#b71c1c]";

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          setSelectedAlertId(alert.id);
                          setDrawerOpen(true);
                        }}
                        className={`w-full grid grid-cols-[40px_2fr_1.5fr_1.5fr_1.5fr_1.5fr_1fr] items-center gap-4 px-5 py-4 rounded-lg transition-colors border ${
                          selectedAlert?.id === alert.id
                            ? "bg-surface border-primary"
                            : "bg-white hover:bg-surface border-transparent hover:border-surface-low"
                        } text-left`}
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-md bg-[#b71c1c] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {alert.type.slice(0, 2)}
                        </div>

                        {/* Type + Message */}
                        <div className="min-w-0">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${typeColor}`}>
                            {alert.type}
                          </span>
                          <p className="text-xs text-on-secondary-container truncate mt-0.5">
                            {alert.message}
                          </p>
                        </div>

                        {/* Niveau */}
                        <div className="flex justify-center">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? "bg-[#ffcccc] text-[#b71c1c]"
                              : "bg-[#fff3e0] text-[#e65100]"
                          }`}>
                            {severity}
                          </span>
                        </div>

                        {/* Statut */}
                        <div className="flex justify-center">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusTone(alert)}`}>
                            {getStatusDisplay(alert)}
                          </span>
                        </div>

                        {/* Temps écoulé */}
                        <div className="flex justify-center">
                          <div className="text-center">
                            <p className="text-xs font-semibold text-on-surface">
                              {formatAgo(alert.declencheeLe)}
                            </p>
                            <p className="text-[10px] text-on-secondary-container mt-0.5">
                              {formatDateTime(alert.declencheeLe)}
                            </p>
                          </div>
                        </div>

                        {/* Bénéficiaire */}
                        <div className="min-w-0 text-center">
                          <p className="text-xs font-semibold text-on-surface truncate">
                            {name}
                          </p>
                          <p className="text-[10px] text-on-secondary-container truncate mt-0.5">
                            {alert.beneficiaire?.dossier?.numeroDossier ?? "—"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlertId(alert.id);
                              setDrawerOpen(true);
                            }}
                            aria-label="Voir détails"
                            className="w-8 h-8 rounded-md bg-surface-low flex items-center justify-center text-on-surface hover:bg-surface-high transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <Link
                            to={`/beneficiaires/${alert.beneficiaireId}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Ouvrir le bénéficiaire"
                            className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white hover:bg-[#2e4d44] transition-colors"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#414845]">
                Page {meta.page} / {totalPages} · {meta.total} alerte(s)
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-11 rounded-xl border border-[#e1e3e2] bg-[#f8faf9] px-3 text-sm text-[#191c1c] outline-none focus:border-[#17362e]"
                >
                  {getPageSizeOptions([6, 10, 15, 20]).map((value) => (
                    <option key={value} value={value}>
                      {value === ALL_PAGE_SIZE ? "Tous" : `${value} / page`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={page <= 1}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-[#414845] transition hover:bg-[#e6e9e8] disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={page >= totalPages}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-[#414845] transition hover:bg-[#e6e9e8] disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedAlert && drawerOpen ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-full border-l border-[#e1e3e2] bg-white shadow-[0_24px_60px_rgba(23,54,46,0.18)] sm:max-w-[40rem]">
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={`mb-3 inline-block rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.3em] ${
                      selectedSeverity === "CRITIQUE"
                        ? "bg-[#ffdad6] text-[#93000a]"
                        : "bg-[#fff3e0] text-[#e65100]"
                    }`}
                  >
                    {selectedAlert.statut === "TRAITEE"
                      ? "Alerte traitée"
                      : selectedAlert.statut === "IGNOREE"
                        ? "Alerte ignorée"
                        : `Alerte ${selectedSeverity?.toLowerCase() ?? ""}`.trim()}
                  </span>
                  <h2
                    className={`font-[Manrope] text-[28px] font-extrabold leading-tight ${
                      selectedSeverity === "CRITIQUE"
                        ? "text-[#93000a]"
                        : "text-[#e65100]"
                    }`}
                  >
                    {selectedAlert.type}
                  </h2>
                  <p className="mt-2 text-sm text-[#191c1c]">{selectedAlert.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f4f3] text-[#17362e] transition hover:bg-[#e6e9e8]"
                  aria-label="Fermer le panneau"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#17362e]">Bénéficiaire</p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedAlert.beneficiaire?.dossier?.prenom} {selectedAlert.beneficiaire?.dossier?.nom}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#17362e]">Dossier n°</p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">{selectedAlert.beneficiaire?.dossier?.numeroDossier ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#17362e]">Bracelet ID</p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-[#191c1c]">{selectedAlert.bracelet?.codeImei ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#17362e]">Statut</p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">{getStatusDisplay(selectedAlert)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#17362e] p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Horodatage judiciaire</p>
                  <p className="font-mono text-sm font-bold text-white">{formatDateTime(selectedAlert.declencheeLe)}</p>
                  <p className="text-[11px] text-white/70">
                    Résolution: {selectedAlert.resolueLe ? formatDateTime(selectedAlert.resolueLe) : "Non traitée"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-[#e65100] bg-[#fff3e0] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#e65100]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e65100]">Action recommandée</p>
                </div>
                <p className="text-sm leading-relaxed text-[#191c1c]">
                  {selectedAlert.actionRecommandee ??
                    "Le sujet a quitté la zone de résidence autorisée. Déclenchement de la procédure d'interpellation niveau 1."}
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to={`/beneficiaires/${selectedAlert.beneficiaireId}`}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#17362e] to-[#2e4d44] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.28em] text-white shadow-md transition hover:brightness-110"
                >
                  <Users size={14} />
                  Ouvrir bénéficiaire
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/surveillance"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e] ring-1 ring-[#e1e3e2] transition hover:bg-[#f2f4f3]"
                  >
                    <MapPin size={13} />
                    Voir carte
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.patch(`/alertes/${selectedAlert.id}/traiter`, {});
                      await refetch();
                    }}
                    disabled={selectedAlert.statut !== "OUVERTE"}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] transition ${
                      selectedAlert.statut === "OUVERTE"
                        ? "border border-[#17362e] bg-white text-[#17362e] hover:bg-[#f2f4f3]"
                        : "cursor-not-allowed border border-[#e1e3e2] bg-[#f2f4f3] text-[#717975] opacity-70"
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    Marquer traitée
                  </button>
                </div>
              </div>

              <div className="border-t border-[#e1e3e2] pt-6">
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#414845]">Activité récente</h3>
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-[#e1e3e2]" />
                  {recentAlerts.map((alert) => {
                    const RecentIcon = alertIcon(alert);
                    const recentSeverity = getSeverity(alert);
                    const dotClass =
                      recentSeverity === "CRITIQUE"
                        ? "bg-[#93000a]"
                        : recentSeverity === "MOYEN"
                          ? "bg-[#e65100]"
                          : recentSeverity === "FAIBLE"
                            ? "bg-[#f57f17]"
                            : "bg-[#576662]";

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          setSelectedAlertId(alert.id);
                          setDrawerOpen(true);
                        }}
                        className="relative flex w-full items-start gap-3 rounded-xl bg-white px-0 py-1 text-left transition hover:bg-[#f8faf9]"
                      >
                        <div className={`absolute left-[2px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-[#f8faf9] ${dotClass}`} />
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f3] text-[#17362e]">
                          <RecentIcon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-[#191c1c]">{alert.type}</p>
                          <p className="mt-1 truncate text-[10px] text-[#414845]">{getBeneficiaryName(alert)}</p>
                          <p className="mt-1 text-[10px] text-[#414845]">{formatAgo(alert.declencheeLe)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
