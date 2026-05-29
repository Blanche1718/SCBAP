import { Link } from "react-router-dom";
import {
  Search,
  Bell,
  HelpCircle,
  AlertTriangle,
  UserRound,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Shield,
  Activity,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { useToast } from "../../context/ToastContext";
import { useBeneficiaires } from "../../hooks/useBeneficiaires";
import { api } from "../../lib/api";
import type { Beneficiaire, Dossier } from "../../types";
import { DAPG_AUTO_SYNC_INTERVAL_MS } from "../../utils/dapgSync";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { formatInAppTimeZone, formatPointageInAppTimeZone } from "../../utils/timezone";

type ComplianceStatus = "NON_CONFORME" | "ACTIF" | "TERMINE" | "A_CONFIGURER";
type RiskLevel = "Faible" | "Moyen" | "Eleve";

function getProfilStatut(beneficiaire: Beneficiaire) {
  return beneficiaire.profilStatut ?? (beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER");
}

function getComplianceStatus(beneficiaire: Beneficiaire): ComplianceStatus {
  const profilStatut = getProfilStatut(beneficiaire);
  if (profilStatut === "REVOQUE") return "NON_CONFORME";
  if (profilStatut === "ACTIF") return "ACTIF";
  return "A_CONFIGURER";
}

function getRiskLevel(beneficiaire: Beneficiaire): RiskLevel {
  const dossierStatut = beneficiaire.dossier?.statut;
  if (dossierStatut === "REVOQUE") return "Eleve";
  if (dossierStatut === "TERMINE") return "Faible";
  return "Moyen";
}

function getDisplayName(beneficiaire: Beneficiaire) {
  const dossier = beneficiaire.dossier;
  if (!dossier) return "—";
  return `${dossier.nom} ${dossier.prenom}`;
}

function getNumeroDossier(beneficiaire: Beneficiaire) {
  return beneficiaire.dossier?.numeroDossier ?? "—";
}

function getNumeroMandatDepot(dossier:Dossier) {
  return dossier.numeroMandatDepot ?? "—";
}



function getUserInitials(prenom?: string | null, nom?: string | null) {
  const initials = [prenom, nom]
    .filter(Boolean)
    .map((value) => value?.trim()?.[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "SC";
}

function isNewBeneficiaire(beneficiaire: Beneficiaire) {
  const dossier = beneficiaire.dossier;
  if (!dossier) return false;
  if (getProfilStatut(beneficiaire) !== "A_CONFIGURER") return false;

  if (dossier.othersData?.source !== "dapg") return false;

  const createdAt = new Date(dossier.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  return Date.now() - createdAt.getTime() < 72 * 60 * 60 * 1000;
}

function formatDossierCreatedAt(dateStr?: string | null) {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "—";

  return formatInAppTimeZone(parsed, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastPointage(dateHeure?: string | null) {
  if (!dateHeure) return "—";
  return formatPointageInAppTimeZone(dateHeure, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const styles =
    status === "NON_CONFORME"
      ? "bg-error-container text-on-error-container"
      : status === "TERMINE"
        ? "bg-surface-high text-on-secondary-container"
        : status === "A_CONFIGURER"
          ? "bg-[#ffe9c7] text-[#6b3d00]"
        : "bg-primary-fixed text-[#2e4d44]";

  const label =
    status === "NON_CONFORME"
      ? "NON-CONFORME"
      : status === "TERMINE"
        ? "TERMINE"
        : status === "A_CONFIGURER"
          ? "Non configuré"
        : "ACTIF";

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${styles}`}>
      {label}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#ffe9c7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6b3d00]">
      Nouveau
    </span>
  );
}

function SetupHint({ createdAt }: { createdAt?: string | null }) {
  return (
    <p className="mt-1 text-[11px] font-medium text-primary">
      Bénéficiaire nouvellement importé, à configurer depuis le {formatDossierCreatedAt(createdAt)}
    </p>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles =
    level === "Eleve"
      ? "text-on-error-container"
      : level === "Moyen"
        ? "text-on-secondary-container"
        : "text-[#2e4d44]";

  const dot =
    level === "Eleve"
      ? "bg-on-error-container"
      : level === "Moyen"
        ? "bg-on-secondary-container"
        : "bg-[#2e4d44]";

  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className={styles}>{level}</span>
    </div>
  );
}

export default function BeneficiairesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"TOUS" | ComplianceStatus>("TOUS");
  const [riskFilter, setRiskFilter] = useState<"TOUS" | RiskLevel>("TOUS");
  const [agentFilter] = useState<"TOUS" | "Agent A." | "Agent B.">("TOUS");
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const { beneficiaires, meta, loading, error, refetch } = useBeneficiaires(page, limit, search);

  const query = search.trim().toLowerCase();
  function getAgentLabel(beneficiaire: Beneficiaire) {
    const numero = getNumeroDossier(beneficiaire);
    if (numero === "—") return "Agent A.";
    const code = numero.charCodeAt(numero.length - 1);
    return code % 2 === 0 ? "Agent A." : "Agent B.";
  }

  const filtered = beneficiaires.filter((b) => {
    const fullName = getDisplayName(b).toLowerCase();
    const numero = getNumeroDossier(b).toLowerCase();
    const matchesSearch = fullName.includes(query) || numero.includes(query);
    const matchesStatus =
      query || statusFilter === "TOUS" || getComplianceStatus(b) === statusFilter;
    const matchesRisk =
      query || riskFilter === "TOUS" || getRiskLevel(b) === riskFilter;
    const matchesAgent =
      agentFilter === "TOUS" || getAgentLabel(b) === agentFilter;

    return matchesSearch && matchesStatus && matchesRisk && matchesAgent;
  });

  const counts = {
    total: meta.total,
    conformes: beneficiaires.filter((b) => getComplianceStatus(b) === "ACTIF").length,
    critiques: beneficiaires.filter((b) => getComplianceStatus(b) === "NON_CONFORME").length,
  };
  const userDisplayName = user ? `${user.prenom} ${user.nom}`.trim() : "Utilisateur";
  const userSubtitle = user?.role?.nom ?? "Session active";
  const userInitials = getUserInitials(user?.prenom, user?.nom);

  const pageStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const pageEnd = meta.total === 0 ? 0 : pageStart + beneficiaires.length - 1;
  const totalPages = Math.max(meta.totalPages, 1);

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

  async function syncDapgDossiers() {
    try {
      setSyncing(true);
      await api.post("/dossiers/dapg/sync", {});
      await refetch();
      showToast("Synchronisation DAPG terminée.", "success");
    } catch (err) {
      setSyncNotice("Aucune synchronisation automatique.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const lastSyncAt = Number(localStorage.getItem("scbap:last-dapg-sync-at") || "0");
    const now = Date.now();

    if (now - lastSyncAt < DAPG_AUTO_SYNC_INTERVAL_MS) {
      return;
    }

    localStorage.setItem("scbap:last-dapg-sync-at", String(now));
    void syncDapgDossiers();
  }, []);

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6">
        <div className="relative w-full lg:max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
          <input
            type="text"
            placeholder="Rechercher un beneficiaire..."
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
          <Link
            to="/rapports/rediges"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-on-error-container bg-error-container hover:bg-error-container/80 transition-colors uppercase tracking-wider"
          >
            <AlertTriangle size={14} />
            Alerte d&apos;urgence
          </Link>
          <div className="hidden sm:flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-on-surface">{userDisplayName}</p>
              <p className="text-[10px] text-on-secondary-container">{userSubtitle}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#2e4d44] text-primary-fixed flex items-center justify-center text-xs font-bold">
              {userInitials}
            </div>
          </div>
        </div>
      </div>

      {/* Title + counters */}
      <div className="rounded-lg bg-white p-4 sm:p-6 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Beneficiaires</h1>
          <p className="text-sm text-on-secondary-container mt-1">
            Supervision de {counts.total} sujets judiciaires actifs
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2 rounded-md bg-primary-fixed text-[#2e4d44] text-xs font-bold uppercase tracking-wider">
            {counts.conformes} sujets conformes
          </div>
          <div className="px-4 py-2 rounded-md bg-error-container text-on-error-container text-xs font-bold uppercase tracking-wider">
            {counts.critiques} alertes critiques
          </div>
          <button
            type="button"
            onClick={syncDapgDossiers}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Synchronisation..." : "Synchroniser"}
          </button>
        </div>
      </div>
      {syncNotice && (
        <div className="mb-4 rounded-md border border-[#ffe9c7] bg-[#fff8ec] px-4 py-2 text-xs font-semibold text-[#6b3d00]">
          {syncNotice}
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
                setStatusFilter(event.target.value as "TOUS" | ComplianceStatus);
                setPage(1);
              }}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="A_CONFIGURER">Non configuré</option>
              <option value="ACTIF">Actif</option>
              <option value="NON_CONFORME">Non-conforme</option>
              <option value="TERMINE">Termine</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Niveau de risque
            <select
              value={riskFilter}
              onChange={(event) => {
                setRiskFilter(event.target.value as "TOUS" | RiskLevel);
                setPage(1);
              }}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Tous les niveaux</option>
              <option value="Faible">Faible</option>
              <option value="Moyen">Moyen</option>
              <option value="Eleve">Eleve</option>
            </select>
          </label>
          {/* <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Agent assigne
            <select
              value={agentFilter}
              onChange={(event) => {
                setAgentFilter(event.target.value as "TOUS" | "Agent A." | "Agent B.");
                setPage(1);
              }}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Tous les agents</option>
              <option value="Agent A.">Agent A.</option>
              <option value="Agent B.">Agent B.</option>
            </select>
          </label> */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("TOUS");
                setRiskFilter("TOUS");
                // setAgentFilter("TOUS");
                setPage(1);
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
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_80px] sm:grid-cols-[40px_minmax(0,1fr)_200px_190px_190px_96px] items-center gap-4 px-5 py-2 mb-2">
        <div className="w-10 shrink-0" />
        <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
          <User size={12} className="text-on-error-container shrink-0" />
          <span className="truncate">Nom du beneficiaire</span>
        </div>
        <div className="hidden sm:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2">
          <Shield size={12} className="text-on-error-container shrink-0" />
          Statut de conformite
        </div>
        <div className="hidden md:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2 text-center">
          <Activity size={12} className="text-on-error-container shrink-0" />
          Facteur de risque
        </div>
        <div className="hidden lg:flex text-xs font-semibold uppercase tracking-wider text-on-error-container items-center justify-center gap-2 text-center">
          <Clock size={12} className="text-on-error-container shrink-0" />
          Dernier pointage
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container text-right flex items-center justify-end gap-2">
          <UserRound size={12} className="text-on-error-container shrink-0" />
          <span className="hidden sm:inline">Actions</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-on-surface-variant gap-3">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="text-sm">Chargement des beneficiaires…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 rounded-lg bg-error-container text-on-error-container">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <Users size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {query ? "Aucun beneficiaire trouve" : "Aucun beneficiaire trouve"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const fullName = getDisplayName(item);
            const numeroMandat = getNumeroMandatDepot(item.dossier ?? { numeroMandatDepot: "—" } as Dossier);
            const statut = getComplianceStatus(item);
            const risque = getRiskLevel(item);
            const lastPointage = item.pointages?.find((pointage) => pointage.statut !== "ABSENT")?.dateHeure;
            const isNew = isNewBeneficiaire(item);

            return (
              <Link
                key={item.id}
                to={`/beneficiaires/${item.id}`}
                className={`grid grid-cols-[40px_1fr_80px] sm:grid-cols-[40px_minmax(0,1fr)_200px_190px_190px_96px] items-center gap-4 px-5 py-4 rounded-lg transition-colors border ${
                  isNew
                    ? "bg-[#eef8f4] border-primary-fixed hover:border-primary"
                    : "bg-white hover:bg-surface border-transparent hover:border-surface-low"
                }`}
              >
                <div className="w-10 h-10 rounded-md bg-[#6f0015] text-error-container flex items-center justify-center text-xs font-bold shrink-0">
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "—"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-on-surface truncate">{fullName}</p>
                    {isNew && <NewBadge />}
                  </div>
                  <p className="text-xs text-on-secondary-container font-mono mt-0.5 truncate">
                    {numeroMandat}
                  </p>
                  {isNew && <SetupHint createdAt={item.dossier?.createdAt} />}
                </div>
                <div className="hidden sm:flex justify-center">
                  <StatusBadge status={statut} />
                </div>
                <div className="hidden md:flex justify-center">
                  <RiskBadge level={risque} />
                </div>
                <p className="hidden lg:block text-xs text-on-surface-variant text-center">
                  {formatLastPointage(lastPointage)}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    aria-label="Voir profil"
                    className="w-8 h-8 rounded-md bg-surface-low flex items-center justify-center text-[#2e4d44] hover:bg-surface-high transition-colors"
                  >
                    <UserRound size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Signaler"
                    className="w-8 h-8 rounded-md bg-error-container flex items-center justify-center text-on-error-container hover:bg-error-container/80 transition-colors"
                  >
                    <Bell size={14} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 rounded-lg bg-white px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-on-surface-variant">
            {meta.total === 0 ? (
              "Aucun beneficiaire a afficher"
            ) : (
              <>
                Affichage de <span className="font-semibold text-on-surface">{pageStart}</span>{" "}
                a <span className="font-semibold text-on-surface">{pageEnd}</span> sur{" "}
                <span className="font-semibold text-on-surface">{meta.total}</span>{" "}
                beneficiaire(s)
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
                {getPageSizeOptions([10, 20, 50]).map((option) => (
                  <option key={option} value={option}>
                    {getPageSizeOptionLabel(option)}
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
                Page {meta.page} / {totalPages}
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
