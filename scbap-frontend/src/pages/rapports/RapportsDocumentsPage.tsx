import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { API_BASE_URL } from "../../lib/api";
import { useDocumentsRecus } from "../../hooks/useRapports";
import type { DocumentRecu } from "../../types";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { getDocumentSourceLabel } from "../../utils/rapports";
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

function getBeneficiaireName(document: DocumentRecu) {
  const dossier = document.beneficiaire.dossier;
  if (!dossier) return "Bénéficiaire";
  return `${dossier.nom} ${dossier.prenom}`;
}

function resolveDocumentHref(href?: string | null) {
  if (!href) return undefined;
  if (/^(https?:)?\/\//i.test(href) || /^(blob|data):/i.test(href)) return href;
  return href.startsWith("/") ? `${API_BASE_URL}${href}` : href;
}

export default function RapportsDocumentsPage() {
  const { items, loading, error, refetch } = useDocumentsRecus();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("TOUS");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((document) => {
      const dossier = document.beneficiaire.dossier;
      const haystack = [
        document.titre,
        document.typeDocument,
        document.description ?? "",
        document.source,
        dossier?.nom ?? "",
        dossier?.prenom ?? "",
        dossier?.numeroDossier ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesSource =
        sourceFilter === "TOUS" || document.source === sourceFilter || document.origin === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [items, search, sourceFilter]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [currentPage, filteredItems, limit]);

  const selectedDocument = useMemo(
    () => items.find((document) => document.id === selectedDocumentId) ?? null,
    [items, selectedDocumentId],
  );
  const selectedDocumentHref = resolveDocumentHref(
    selectedDocument?.downloadUrl ?? selectedDocument?.previewUrl,
  );

  useEffect(() => {
    if (!selectedDocumentId && items.length > 0) {
      setSelectedDocumentId(items[0].id);
    }
  }, [items, selectedDocumentId]);

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter]);

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
              Documents reçus
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Pièces issues de la DAPG ou des téléversements effectués dans le dossier du bénéficiaire.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-low px-4 py-4 text-center">
              <p className="text-2xl font-bold text-on-surface">{items.length}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">Documents</p>
            </div>
            <div className="rounded-2xl bg-primary-fixed/70 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-[#17362e]">
                {items.filter((item) => item.source === "DAPG" || item.origin === "DAPG").length}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#33584b]">DAPG</p>
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
              placeholder="Rechercher un document, un type ou un bénéficiaire…"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-11 rounded-xl border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="TOUS">Toutes provenances</option>
            <option value="DAPG">DAPG</option>
            <option value="MANUAL">Téléversé</option>
            <option value="SCBAP">SCBAP</option>
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
            <FolderOpen size={24} className="mx-auto text-outline-variant" />
            <p className="mt-4 text-sm font-semibold text-on-surface">
              Aucun document reçu ne correspond aux filtres actuels.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_140px_160px_140px_60px] items-center gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#17362e] md:grid">
              <span>Document</span>
              <span>Source</span>
              <span>Statut</span>
              <span>Date</span>
              <span className="text-right">Action</span>
            </div>
            {paginatedItems.map((document) => {
              const selected = selectedDocument?.id === document.id;
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocumentId(document.id);
                    setDrawerOpen(true);
                  }}
                  className={`grid w-full grid-cols-[minmax(0,1.3fr)_140px_160px_140px_60px] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-surface"
                      : "border-transparent bg-surface-low hover:border-surface-high hover:bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface">{document.titre}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {getBeneficiaireName(document)} • {document.typeDocument}
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {getDocumentSourceLabel(document.source)}
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {document.statut}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {formatDateTime(document.uploadedAt || document.createdAt)}
                  </div>
                  <div className="flex justify-end text-primary">
                    <ArrowUpRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SideDrawer open={drawerOpen && !!selectedDocument} onClose={() => setDrawerOpen(false)} showCloseButton>
        {selectedDocument ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="pr-12">
                <span className="mb-3 inline-block rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#576662]">
                  {getDocumentSourceLabel(selectedDocument.source)}
                </span>
                <h2 className="text-[28px] font-extrabold leading-tight text-[#17362e]">
                  {selectedDocument.titre}
                </h2>
                <p className="mt-2 text-sm text-[#414845]">
                  Document reçu pour {getBeneficiaireName(selectedDocument)}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Bénéficiaire
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {getBeneficiaireName(selectedDocument)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Dossier
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedDocument.beneficiaire.dossier?.numeroDossier ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Type
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {selectedDocument.typeDocument}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Reçu le
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {formatDateTime(selectedDocument.uploadedAt || selectedDocument.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-[#17362e] bg-[#f2f4f3] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileText size={14} className="text-[#17362e]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17362e]">
                    Description et statut
                  </p>
                </div>
                <p className="text-sm leading-7 text-[#191c1c]">
                  {selectedDocument.description || "Aucune description complémentaire."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#576662]">
                  Statut : {selectedDocument.statut}
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to={`/beneficiaires/${selectedDocument.beneficiaire.id}`}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#17362e] to-[#2e4d44] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.28em] text-white shadow-md transition hover:brightness-110"
                >
                  Ouvrir bénéficiaire
                </Link>
                {selectedDocumentHref ? (
                  <a
                    href={selectedDocumentHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#17362e] transition hover:bg-[#f2f4f3]"
                  >
                    <ArrowUpRight size={14} />
                    Télécharger le document
                  </a>
                ) : (
                  <div className="rounded-lg border border-dashed border-surface-high bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                    Aucun lien de consultation n’est disponible pour ce document.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}
