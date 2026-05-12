import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { API_BASE_URL } from "../../lib/api";
import { useEvaluationsRecues } from "../../hooks/useRapports";
import type { EvaluationRecue } from "../../types";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { getConformiteLabel, getConformiteTone } from "../../utils/rapports";
import { formatInAppTimeZone } from "../../utils/timezone";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return formatInAppTimeZone(new Date(value), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBeneficiaireName(evaluation: EvaluationRecue) {
  const dossier = evaluation.beneficiaire.dossier;
  if (!dossier) return "Bénéficiaire";
  return `${dossier.nom} ${dossier.prenom}`;
}

export default function RapportsEvaluationsPage() {
  const { items, loading, error, refetch } = useEvaluationsRecues();
  const [search, setSearch] = useState("");
  const [conformiteFilter, setConformiteFilter] = useState("TOUS");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((evaluation) => {
      const dossier = evaluation.beneficiaire.dossier;
      const haystack = [
        dossier?.nom ?? "",
        dossier?.prenom ?? "",
        dossier?.numeroDossier ?? "",
        evaluation.service.nom,
        evaluation.affectation.libelleSuivi,
        evaluation.affectation.typeSuivi,
        evaluation.conformite,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesConformite =
        conformiteFilter === "TOUS" || evaluation.conformite === conformiteFilter;

      return matchesSearch && matchesConformite;
    });
  }, [conformiteFilter, items, search]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [currentPage, filteredItems, limit]);

  const selectedEvaluation = useMemo(
    () => items.find((evaluation) => evaluation.id === selectedEvaluationId) ?? null,
    [items, selectedEvaluationId],
  );

  const summary = useMemo(
    () => ({
      total: items.length,
      satisfaisants: items.filter((item) => item.conformite === "SATISFAISANT").length,
      preoccupants: items.filter((item) => item.conformite === "PREOCCUPANT").length,

    }),
    [items],
  );

  useEffect(() => {
    if (!selectedEvaluationId && items.length > 0) {
      setSelectedEvaluationId(items[0].id);
    }
  }, [items, selectedEvaluationId]);

  useEffect(() => {
    setPage(1);
  }, [search, conformiteFilter]);

  return (
    <div className="min-h-full bg-surface px-4 py-6 sm:px-8">
      <div className="mb-8 rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(23,54,46,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to="/rapports"
              className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              <ArrowLeft size={15} />
              Retour à Rapports
            </Link>
            <h1 className="mt-3 text-[30px] font-extrabold text-[#17362e]">
              Évaluations reçues
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Suivi des évaluations externes soumises par les services partenaires.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-surface-low px-4 py-4 text-center">
              <p className="text-2xl font-bold text-on-surface">{summary.total}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">Total</p>
            </div>
            <div className="rounded-2xl bg-primary-fixed/70 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-[#17362e]">{summary.satisfaisants}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#33584b]">Satisfaisant</p>
            </div>
            <div className="rounded-2xl bg-[#ffcccc] px-4 py-4 text-center">
              <p className="text-2xl font-bold text-[#93000a]">{summary.preoccupants}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#93000a]">Préoccupant</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-surface-high bg-white p-4 shadow-[0_12px_35px_rgba(23,54,46,0.06)] sm:p-5">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_120px] lg:items-center">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-surface-high bg-surface-highest pl-9 pr-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
              placeholder="Rechercher un bénéficiaire, un service, un suivi…"
            />
          </div>
          <select
            value={conformiteFilter}
            onChange={(event) => setConformiteFilter(event.target.value)}
            className="h-11 rounded-xl border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="TOUS">Toutes conformités</option>
            <option value="SATISFAISANT">Satisfaisant</option>
            <option value="A_SURVEILLER">À surveiller</option>
            <option value="PREOCCUPANT">Préoccupant</option>
          </select>
          <CompactPaginationControls
            page={currentPage}
            totalPages={totalPages}
            loading={loading}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="h-11 rounded-xl border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            {getPageSizeOptions([10, 15, 20]).map((value) => (
              <option key={value} value={value}>
                {getPageSizeOptionLabel(value)} / page
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-surface-high bg-white px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        ) : loading ? (
          <div className="flex min-h-72 items-center justify-center text-on-surface-variant">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-high bg-surface-low px-6 py-14 text-center">
            <ClipboardList size={24} className="mx-auto text-outline-variant" />
            <p className="mt-4 text-sm font-semibold text-on-surface">
              Aucune évaluation reçue ne correspond aux filtres actuels.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_160px_160px_120px_60px] items-center gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#17362e] md:grid">
              <span>Bénéficiaire / suivi</span>
              <span>Date</span>
              <span>Conformité</span>
              <span>Code suivi</span>
              <span className="text-right">Action</span>
            </div>
            {paginatedItems.map((evaluation) => {
              const selected = selectedEvaluation?.id === evaluation.id;
              return (
                <button
                  key={evaluation.id}
                  type="button"
                  onClick={() => {
                    setSelectedEvaluationId(evaluation.id);
                    setDrawerOpen(true);
                  }}
                  className={`grid w-full grid-cols-[minmax(0,1.3fr)_160px_160px_120px_60px] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-surface"
                      : "border-transparent bg-surface-low hover:border-surface-high hover:bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className=" text-sm font-bold text-red-900">
                      {getBeneficiaireName(evaluation)}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {evaluation.service.nom} • {evaluation.affectation.libelleSuivi}
                    </p>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {formatDateTime(evaluation.createdAt)}
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getConformiteTone(evaluation.conformite)}`}>
                      {getConformiteLabel(evaluation.conformite)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-on-surface">
                    {evaluation.affectation.codeSuivi}
                  </div>
                  <div className="flex justify-end text-primary">
                    <ArrowRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SideDrawer open={drawerOpen && !!selectedEvaluation} onClose={() => setDrawerOpen(false)} showCloseButton>
        {selectedEvaluation ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="pr-12">
                <span className={`mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${getConformiteTone(selectedEvaluation.conformite)}`}>
                  {getConformiteLabel(selectedEvaluation.conformite)}
                </span>
                <h2 className="text-[28px] font-extrabold leading-tight text-[#920f4c]">
                  {selectedEvaluation.affectation.libelleSuivi}
                </h2>
                <p className="mt-2 text-sm text-[#414845]">
                  Évaluation soumise par {selectedEvaluation.service.nom} pour {getBeneficiaireName(selectedEvaluation)}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#aa3146]">
                    Bénéficiaire
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {getBeneficiaireName(selectedEvaluation)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#aa3146]">
                    Service
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedEvaluation.service.nom}
                  </p>
                </div>
                {/* <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Date du constat
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedEvaluation.dateConstat}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Période
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedEvaluation.periodeMois}
                  </p>
                </div> */}
              </div>

              <div className="rounded-xl bg-[#17362e] p-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                  Résumé de la soumission
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/70">Présence</p>
                    <p className="text-sm font-bold">
                      {selectedEvaluation.occurrences && selectedEvaluation.occurrences.length > 0
                        ? `${selectedEvaluation.occurrences.filter((o) => o.present).length} / ${selectedEvaluation.occurrences.length}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Reçue le</p>
                    <p className="text-sm font-bold">
                      {formatDateTime(selectedEvaluation.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-[#17362e] bg-[#f2f4f3] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays size={14} className="text-[#17362e]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17362e]">
                    Détails du suivi
                  </p>
                </div>
                <div className="space-y-3 text-sm text-[#191c1c]">
                  <p>
                    <span className="font-semibold">Type de suivi :</span>{" "}
                    {selectedEvaluation.affectation.typeSuivi}
                  </p>
                  <p>
                    <span className="font-semibold">Code de suivi :</span>{" "}
                    {selectedEvaluation.affectation.codeSuivi}
                  </p>
                  {selectedEvaluation.obligation?.description ? (
                    <p>
                      <span className="font-semibold">Obligation liée :</span>{" "}
                      {selectedEvaluation.obligation.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-surface-high bg-white p-4">
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#1e097a]">
                    Observations
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#191c1c]">
                    {selectedEvaluation.observations || "Aucune observation renseignée."}
                  </p>
                </div>
                {/* <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#1e097a]">
                    Commentaire libre
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#191c1c]">
                    {selectedEvaluation.commentaire || "Aucun commentaire libre."}
                  </p>
                </div> */}
              </div>

              {/* Détail des présences */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList size={14} className="text-[#17362e]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17362e]">
                    Détail des présences
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-high bg-white p-2">
                  {selectedEvaluation.occurrences && selectedEvaluation.occurrences.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {selectedEvaluation.occurrences.map((occ) => (
                      <div key={occ.id} className="flex items-center justify-between rounded-md bg-surface-low px-2 py-1.5 text-xs">
                        <span className="font-mono font-medium text-on-surface">{occ.dateSuivi}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          occ.present ? "bg-primary-fixed text-[#17362e]" : "bg-error-container text-on-error-container"
                        }`}>
                          {occ.present ? "Présent" : "Absent"}
                        </span>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-surface-high bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                      Données de présence détaillées non disponibles.
                    </div>
                  )}
                </div>
              </div>

              {/* Pièces jointes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#17362e]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17362e]">
                    Pièces jointes
                  </p>
                </div>
                {selectedEvaluation.documents && selectedEvaluation.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvaluation.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-xl border border-surface-high bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-low text-primary">
                            <FileText size={16} />
                          </div>
                          <div className="truncate text-left">
                            <p className="text-sm font-bold text-on-surface truncate">{doc.titre}</p>
                            <p className="text-[10px] text-on-surface-variant truncate">{doc.fileName}</p>
                          </div>
                        </div>
                        <a
                          href={`${API_BASE_URL}${doc.downloadUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-surface-low transition-colors"
                          title="Télécharger le document"
                        >
                          <ArrowUpRight size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-surface-high bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                    Aucune pièce jointe associée.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Link
                  to={`/beneficiaires/${selectedEvaluation.beneficiaire.id}`}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#17362e] to-[#2e4d44] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.28em] text-white shadow-md transition hover:brightness-110"
                >
                  <Shield size={14} />
                  Ouvrir bénéficiaire
                </Link>
                <div className="rounded-lg border border-surface-high bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                  Cette évaluation a déjà été reçue et archivée dans le système SCBAP.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}
