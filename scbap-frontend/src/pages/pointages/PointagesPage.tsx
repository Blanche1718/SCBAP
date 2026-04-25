import { Link } from "react-router-dom";
import {
  Search,
  Bell,
  HelpCircle,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Activity,
  Eye,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { usePointages } from "../../hooks/usePointages";
import type { Pointage } from "../../types";

type PointageStatus = "VALIDE" | "ABSENT" | "EN_RETARD" | "ANOMALIE";

function getDisplayName(pointage: Pointage) {
  const dossier = pointage.beneficiaire?.dossier;
  if (!dossier) return "—";
  return `${dossier.nom} ${dossier.prenom}`;
}

function getNumeromandat(pointage: Pointage) {
  return pointage.beneficiaire?.dossier?.numeroMandatDepot ?? "—";
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Porto-Novo",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "ABSENT"
      ? "bg-error-container text-on-error-container animate-pulse"
      : status === "EN_RETARD"
        ? "bg-[#ffe9c7] text-[#6b3d00]"
        : status === "ANOMALIE"
          ? "bg-[#eadcff] text-[#5a3c9d]"
        : "bg-primary-fixed text-[#2e4d44]";

  const label =
    status === "ABSENT"
      ? "ABSENT"
      : status === "EN_RETARD"
        ? "EN RETARD"
        : status === "ANOMALIE"
          ? "ANOMALIE"
        : "VALIDE";

  const Icon =
    status === "ABSENT"
      ? XCircle
      : status === "EN_RETARD"
        ? Clock
        : status === "ANOMALIE"
          ? AlertTriangle
        : CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${styles}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export default function PointagesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"TOUS" | PointageStatus>("TOUS");
  const [lieuFilter, setLieuFilter] = useState("");
  const { pointages, meta, loading, error } = usePointages(
    page,
    limit,
    search,
    statusFilter === "TOUS" ? "" : statusFilter,
    "",
    lieuFilter,
    ""
  );

  const query = search.trim().toLowerCase();

  const filtered = pointages.filter((p) => {
    const fullName = getDisplayName(p).toLowerCase();
    const numero = getNumeromandat(p).toLowerCase();
    const lieu = (p.lieu || "").toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      numero.includes(query) ||
      lieu.includes(query);

    return matchesSearch;
  });

  const counts = {
    total: meta.total,
    valides: meta.globalStats?.valide ?? 0,
    absences: meta.globalStats?.absent ?? 0,
  };

  const currentPageAbsences = filtered.filter((p) => p.statut === "ABSENT").length;

  const pageStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const pageEnd = meta.total === 0 ? 0 : pageStart + pointages.length - 1;

  function goToPreviousPage() {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }

  function goToNextPage() {
    setPage((currentPage) => {
      if (meta.totalPages === 0) {
        return currentPage;
      }
      return Math.min(meta.totalPages, currentPage + 1);
    });
  }

  function handleLimitChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLimit = Number(event.target.value);
    setLimit(nextLimit);
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6">
        <div className="relative w-full lg:max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
          <input
            type="text"
            placeholder="Rechercher un pointage..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            <Bell size={16} />
          </button>
          <button
            type="button"
            aria-label="Aide"
            className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-on-error-container bg-error-container hover:bg-error-container/80 transition-colors uppercase tracking-wider"
          >
            <AlertTriangle size={14} />
            Alerte pointages
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white bg-primary hover:bg-[#2e4d44] transition-colors uppercase tracking-wider"
          >
            <Plus size={14} />
            Enregistrer
          </button>
        </div>
      </div>

      {/* Title + counters */}
      <div className="rounded-lg bg-white p-4 sm:p-6 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Pointages</h1>
          <p className="text-sm text-on-secondary-container mt-1">
            Journal de {counts.total} pointage(s) enregistre(s)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2 rounded-md bg-primary-fixed text-[#2e4d44] text-xs font-bold uppercase tracking-wider">
            {counts.valides} valides
          </div>
          <div className="px-4 py-2 rounded-md bg-error-container text-on-error-container text-xs font-bold uppercase tracking-wider">
            {counts.absences} absences
          </div>
        </div>
      </div>

      {/* Absence Alert Banner */}
      {currentPageAbsences > 0 && (
        <div className="mb-4 rounded-lg bg-error-container text-on-error-container px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          <p className="text-sm font-semibold">
            {currentPageAbsences} absence{currentPageAbsences > 1 ? 's' : ''} de pointage{currentPageAbsences > 1 ? 's' : ''} détectée{currentPageAbsences > 1 ? 's' : ''} sur cette liste
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Statut
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "TOUS" | PointageStatus);
                setPage(1);
              }}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="VALIDE">Valides</option>
              <option value="ABSENT">Absences</option>
              <option value="EN_RETARD">Retards</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Lieu
            <input
              type="text"
              placeholder="Filtrer par lieu..."
              value={lieuFilter}
              onChange={(event) => {
                setLieuFilter(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("TOUS");
                setLieuFilter("");
                setPage(1);
              }}
              className="w-full rounded-md bg-surface-high px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2e4d44] hover:bg-[#d9dddb] transition-colors"
            >
              Effacer filtres
            </button>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_80px] sm:grid-cols-[40px_minmax(0,1fr)_150px_180px_150px_96px] items-center gap-4 px-5 py-2 mb-2">
        <div className="w-10 shrink-0" />
        <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
          <Activity size={12} className="text-on-error-container shrink-0" />
          <span className="truncate">Benéficiaire</span>
        </div>
        <div className="hidden sm:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2">
          <Clock size={12} className="text-on-error-container shrink-0" />
          Statut
        </div>
        <div className="hidden sm:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2">
          <Clock size={12} className="text-on-error-container shrink-0" />
          Date & Heure
        </div>
        <div className="hidden md:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2">
          <MapPin size={12} className="text-on-error-container shrink-0" />
          Lieu
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container text-right flex items-center justify-end gap-2">
          <Eye size={12} className="text-on-error-container shrink-0" />
          <span className="hidden sm:inline">Actions</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-on-surface-variant gap-3">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="text-sm">Chargement des pointages…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 rounded-lg bg-error-container text-on-error-container">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <Clock size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {query ? "Aucun pointage trouve sur cette page" : "Aucun pointage trouve"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const fullName = getDisplayName(item);
            const numeromandat = getNumeromandat(item);
            const dateTime = formatDateTime(item.dateHeure);
            const isAbsent = item.statut === "ABSENT";

            return (
              <div
                key={item.id}
                className={`grid grid-cols-[40px_1fr_80px] sm:grid-cols-[40px_minmax(0,1fr)_150px_150px_150px_96px] items-center gap-4 px-5 py-4 rounded-lg transition-colors border ${
                  isAbsent
                    ? "bg-error-container/10 border-red-300"
                    : "bg-white hover:bg-surface border-transparent hover:border-surface-low"
                } ${isAbsent ? "border-l-4 border-l-red-600" : ""}`}
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  isAbsent
                    ? "bg-error-container text-on-error-container"
                    : "bg-primary-fixed text-[#2e4d44]"
                }`}>
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "—"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{fullName}</p>
                  <p className="text-xs text-on-secondary-container font-mono mt-0.5 truncate">
                    Mandat: {numeromandat}
                  </p>
                </div>
                <div className="hidden sm:flex justify-center">
                  <StatusBadge status={item.statut} />
                </div>
                <p className="hidden sm:block text-xs text-on-surface-variant text-center">
                  {dateTime}
                </p>
                <div className="hidden md:block">
                  <p className="text-xs text-on-surface-variant text-center truncate">
                    {item.lieu || "—"}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    to={`/beneficiaires/${item.beneficiaire?.id}`}
                    className="w-8 h-8 rounded-md bg-surface-low flex items-center justify-center text-[#2e4d44] hover:bg-surface-high transition-colors"
                    aria-label="Voir profil du beneficiaire"
                  >
                    <Eye size={14} />
                  </Link>
                  <button
                    type="button"
                    aria-label="Actions"
                    className="w-8 h-8 rounded-md bg-surface-low flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors sm:hidden"
                  >
                    <AlertTriangle size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 rounded-lg bg-white px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-on-surface-variant">
            {meta.total === 0 ? (
              "Aucun pointage a afficher"
            ) : (
              <>
                Affichage de <span className="font-semibold text-on-surface">{pageStart}</span>{" "}
                a <span className="font-semibold text-on-surface">{pageEnd}</span> sur{" "}
                <span className="font-semibold text-on-surface">{meta.total}</span>{" "}
                pointage(s)
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Par page
              <select
                value={limit}
                onChange={handleLimitChange}
                className="rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[10, 20, 50].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={loading || meta.page <= 1}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-low text-xs font-semibold text-on-surface-variant hover:bg-surface-high transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Precedent
              </button>
              <div className="min-w-28 text-center text-sm font-medium text-on-surface">
                Page {meta.page} / {Math.max(meta.totalPages, 1)}
              </div>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={loading || meta.totalPages === 0 || meta.page >= meta.totalPages}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-xs font-semibold text-white hover:bg-[#2e4d44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
