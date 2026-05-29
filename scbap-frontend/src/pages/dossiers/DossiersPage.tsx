import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FileText,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  User,
  Gavel,
  Calendar,
  BadgeCheck,
  UserRound,
  RefreshCw,
  Download,
} from "lucide-react";
import { useDossiers } from "../../hooks/useDossiers";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { Button } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import type { Dossier } from "../../types";
import { DAPG_AUTO_SYNC_INTERVAL_MS } from "../../utils/dapgSync";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { formatInAppTimeZone } from "../../utils/timezone";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return formatInAppTimeZone(new Date(dateStr), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DossierRow({ dossier }: { dossier: Dossier }) {
  return (
    <Link
      to={`/dossiers/${dossier.id}`}
      className="grid grid-cols-[36px_1fr_40px_16px] sm:grid-cols-[36px_minmax(0,1fr)_170px_130px_190px_60px_16px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 rounded-lg bg-white hover:bg-surface transition-colors group border border-transparent hover:border-surface-low"
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
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const hasAutoSyncedRef = useRef(false);
  const { dossiers, meta, loading, error, refetch } = useDossiers(page, limit, search);

  const query = search.trim().toLowerCase();
  const filtered = dossiers;

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

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleSyncDapg() {
    setSyncing(true);

    try {
      const response = await api.post<{
        message: string;
        data: {
          totalSynced: number;
          createdCount: number;
          updatedCount: number;
          lastPage: number;
        };
      }>("/dossiers/dapg/sync", {});

      const { createdCount, updatedCount, totalSynced } = response.data;
      showToast(
        totalSynced === 0
          ? "Aucun nouveau dossier DAPG à synchroniser."
          : `${createdCount} nouveau(x) dossier(s), ${updatedCount} mis à jour.`
      , "success");

      if (page === 1) {
        await refetch();
      } else {
        setPage(1);
      }
    } catch (e) {
      setSyncNotice("Aucune synchronisation automatique.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportDossiers() {
    setExporting(true);

    try {
      const { blob, filename } = await api.download("/dossiers/export");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `scbap-dossiers-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Export Excel généré avec succès.", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    const lastSyncAt = Number(localStorage.getItem("scbap:last-dapg-sync-at") || "0");
    const now = Date.now();
    if (now - lastSyncAt < DAPG_AUTO_SYNC_INTERVAL_MS) return;

    hasAutoSyncedRef.current = true;
    localStorage.setItem("scbap:last-dapg-sync-at", String(now));
    void handleSyncDapg();
  }, []);

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      {/* ── Summary ribbon ── */}
      <div
        className="rounded-lg px-6 py-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-6 lg:gap-8 text-white"
        style={{ background: "linear-gradient(135deg, #17362e 0%, #2e4d44 60%, #93000a 160%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Shield size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.total}</p>
            <p className="text-xs text-white/70 font-medium">Dossiers total</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Activity size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.affiches}</p>
            <p className="text-xs text-white/70 font-medium">Affichés sur la page</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-10 bg-white/15" />
        {/* <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-fixed flex items-center justify-center">
            <CheckCircle2 size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.actifs}</p>
            <p className="text-xs text-white/70 font-medium">Actifs sur la page</p>
          </div>
        </div> */}
        {/* <div className="hidden lg:block w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-error-container flex items-center justify-center">
            <XCircle size={16} className="text-on-error-container" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.alertes}</p>
            <p className="text-xs text-white/70 font-medium">Révoqués sur la page</p>
          </div>
        </div> */}
        <div className="sm:col-span-2 lg:ml-auto text-left lg:text-right text-xs text-white/70">
          <p>
            Page {meta.page} / {Math.max(meta.totalPages, 1)}
          </p>
          <p className="mt-1">
            Mis à jour :{" "}
            {formatInAppTimeZone(new Date(), {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Dossiers
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Dossiers synchronises depuis l&apos;API judiciaire externe
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* <span className="inline-flex items-center gap-2 rounded-full bg-error-container px-3 py-1 text-[11px] font-bold text-on-error-container uppercase tracking-wider">
            <AlertCircle size={12} />
            Alertes actives
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold text-[#2e4d44] uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Suivi stable
          </span> */}
          <Button
            variant="ghost"
            size="sm"
            loading={syncing}
            onClick={handleSyncDapg}
            className="ml-1"
          >
            <RefreshCw size={14} />
            Synchroniser
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={exporting}
            onClick={handleExportDossiers}
            className="ml-1"
          >
            <Download size={14} />
            Exporter Excel
          </Button>
        </div>
      </div>
      {syncNotice && (
        <div className="mb-4 rounded-md border border-[#ffe9c7] bg-[#fff8ec] px-4 py-2 text-xs font-semibold text-[#6b3d00]">
          {syncNotice}
        </div>
      )}
      {/* ── Search ── */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-3xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou numéro de dossier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-md bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
          />
        </div>
        <CompactPaginationControls
          page={page}
          totalPages={meta.totalPages}
          loading={loading}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          className="self-end lg:self-auto"
        />
      </div>

      {/* ── Column headers ── */}
      <div className="hidden sm:grid grid-cols-[36px_minmax(0,1fr)_170px_130px_190px_60px_16px] items-center gap-4 px-5 py-2 mb-2">
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
            {query ? "Aucun dossier trouve" : "Aucun dossier trouve"}
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
        <div className="mt-6 rounded-lg bg-white p-4 sm:px-5 sm:py-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Par page
              <select
                value={limit}
                onChange={handleLimitChange}
                className="rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                {getPageSizeOptions([10, 20, 50]).map((option) => (
                  <option key={option} value={option}>
                    {getPageSizeOptionLabel(option)}
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
