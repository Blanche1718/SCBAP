import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FileText,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
  XCircle,
  Activity,
  User,
  Gavel,
  Calendar,
  BadgeCheck,
  UserRound,
} from "lucide-react";
import { useDossiers } from "../../hooks/useDossiers";
import { Button } from "../../components/ui";
import type { Dossier } from "../../types";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DossierRow({ dossier }: { dossier: Dossier }) {
  return (
    <Link
      to={`/dossiers/${dossier.id}`}
      className="grid grid-cols-[36px_minmax(0,1fr)_170px_130px_190px_60px_16px] items-center gap-4 px-5 py-4 rounded-lg bg-white hover:bg-surface transition-colors group border border-transparent hover:border-surface-low"
    >
      {/* Avatar initials */}
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-xs font-bold bg-[#6f0015] text-error-container">
        {dossier.nom[0]}{dossier.prenom[0]}
      </div>

      {/* Name + dossier no */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {dossier.nom} {dossier.prenom}
        </p>
        <p className="text-xs text-on-surface-variant font-mono mt-0.5 truncate">
          {dossier.numeroDossier}
        </p>
      </div>

      {/* Infraction */}
      <div className="hidden md:block min-w-0">
        <p className="text-xs text-on-surface-variant truncate flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-on-error-container" />
          {dossier.infractions || "—"}
        </p>
      </div>

      {/* Fin de peine */}
      <div className="hidden lg:block text-right">
        <p className="text-xs text-on-surface-variant flex items-center justify-end gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-error-container" />
          {formatDate(dossier.dateFinPeine)}
        </p>
      </div>

      {/* Numero mandat */}
      <div className="hidden lg:block text-right">
        <p className="text-xs text-on-surface-variant font-mono truncate flex items-center justify-end gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed" />
          {dossier.numeroMandatDepot || "—"}
        </p>
      </div>

      {/* Sexe */}
      <div className="text-right">
        <p className="text-xs font-semibold text-on-surface flex items-center justify-end gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-on-error-container" />
          {dossier.sexe === "M" ? "M" : dossier.sexe === "F" ? "F" : "—"}
        </p>
      </div>

      {/* Arrow */}
      <span className="text-outline-variant group-hover:text-on-surface-variant transition-colors text-lg leading-none">›</span>
    </Link>
  );
}

export default function DossiersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { dossiers, meta, loading, error } = useDossiers(page, limit);

  const query = search.trim().toLowerCase();
  const filtered = dossiers.filter((d) => {
    return (
      d.nom.toLowerCase().includes(query) ||
      d.prenom.toLowerCase().includes(query) ||
      d.numeroDossier.toLowerCase().includes(query)
    );
  });

  const counts = {
    total: meta.total,
    affiches: dossiers.length,
    actifs: dossiers.filter((d) => d.statut === "ACTIF").length,
    alertes: dossiers.filter((d) => d.statut === "REVOQUE").length,
  };

  const pageStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const pageEnd = meta.total === 0 ? 0 : pageStart + dossiers.length - 1;

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
    <div className="p-8 min-h-full">
      {/* ── Summary ribbon ── */}
      <div
        className="rounded-lg px-6 py-5 mb-8 flex items-center gap-8 text-white"
        style={{ background: "linear-gradient(135deg, #17362e 0%, #2e4d44 60%, #93000a 160%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Shield size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-on-secondary-containerxl font-bold">{counts.total}</p>
            <p className="text-xs text-white/70 font-medium">Dossiers total</p>
          </div>
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Activity size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-on-secondary-containerxl font-bold">{counts.affiches}</p>
            <p className="text-xs text-white/70 font-medium">Affichés sur la page</p>
          </div>
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-fixed flex items-center justify-center">
            <CheckCircle2 size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-on-secondary-containerxl font-bold">{counts.actifs}</p>
            <p className="text-xs text-white/70 font-medium">Actifs sur la page</p>
          </div>
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-error-container flex items-center justify-center">
            <XCircle size={16} className="text-on-error-container" />
          </div>
          <div>
            <p className="text-on-secondary-containerxl font-bold">{counts.alertes}</p>
            <p className="text-xs text-white/70 font-medium">Révoqués sur la page</p>
          </div>
        </div>
        <div className="ml-auto text-right text-xs text-white/70">
          <p>
            Page {meta.page} / {Math.max(meta.totalPages, 1)}
          </p>
          <p className="mt-1">
            Mis à jour :{" "}
            {new Date().toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Dossiers
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Dossiers synchronises depuis l&apos;API judiciaire externe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-error-container px-3 py-1 text-[11px] font-bold text-on-error-container uppercase tracking-wider">
            <AlertCircle size={12} />
            Alertes actives
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold text-[#2e4d44] uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Suivi stable
          </span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou numéro de dossier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
        />
      </div>
      <p className="mb-5 text-xs text-on-secondary-container">
        La recherche s&apos;applique aux dossiers charges sur la page en cours.
      </p>

      {/* ── Column headers ── */}
      <div className="grid grid-cols-[36px_minmax(0,1fr)_170px_130px_190px_60px_16px] items-center gap-4 px-5 py-2 mb-2">
        <div className="w-9 shrink-0" />
        <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
          <User size={12} className="text-on-error-container shrink-0" />
          <span className="leading-none">Bénéficiaire</span>
        </div>
        <div className="hidden md:block">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
            <Gavel size={12} className="text-on-error-container shrink-0" />
            <span className="leading-none">Infraction</span>
          </div>
        </div>
        <div className="hidden lg:block text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container inline-flex items-center justify-end gap-2">
            <Calendar size={12} className="text-on-error-container shrink-0" />
            <span className="leading-none">Fin de peine</span>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center justify-center gap-2 pr-4">
            <BadgeCheck size={12} className="text-on-error-container shrink-0" />
            <span className="leading-none">N° Mandat</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container inline-flex items-center justify-end gap-2">
            <UserRound size={12} className="text-on-error-container shrink-0" />
            <span className="leading-none">Sexe</span>
          </div>
        </div>
        <div className="w-4" />
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant gap-3">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="text-sm">Chargement des dossiers…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 rounded-lg bg-error-container text-on-error-container">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <FileText size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {query ? "Aucun dossier trouve sur cette page" : "Aucun dossier trouve"}
          </p>
        </div>
      ) : (
      <div className="space-y-1.5">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-transparent hover:border-surface-high transition-colors"
            >
              <DossierRow dossier={d} />
            </div>
          ))}
      </div>
      )}

      {!loading && !error && (
        <div className="mt-6 rounded-lg bg-white px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-on-surface-variant">
            {meta.total === 0 ? (
              "Aucun dossier a afficher"
            ) : (
              <>
                Affichage de <span className="font-semibold text-on-surface">{pageStart}</span> a{" "}
                <span className="font-semibold text-on-surface">{pageEnd}</span> sur{" "}
                <span className="font-semibold text-on-surface">{meta.total}</span> dossier(s)
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
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousPage}
                disabled={loading || meta.page <= 1}
              >
                <ChevronLeft size={14} />
                Precedent
              </Button>
              <div className="min-w-28 text-center text-sm font-medium text-on-surface">
                Page {meta.page} / {Math.max(meta.totalPages, 1)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPage}
                disabled={loading || meta.totalPages === 0 || meta.page >= meta.totalPages}
              >
                Suivant
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
