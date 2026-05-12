import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  FileBadge2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Download,
  Trash2,
} from "lucide-react";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { useToast } from "../../context/ToastContext";
import { useBeneficiaires } from "../../hooks/useBeneficiaires";
import { API_BASE_URL, api } from "../../lib/api";
import {
  createPrefilledRapport,
  finalizeRapport,
  reopenRapportDraft,
  updateDraftRapport,
  useRapportsRediges,
  type DraftRapportPayload,
} from "../../hooks/useRapports";
import type { Beneficiaire, Document as BeneficiaireDocument, RapportRedige, ApiResponse } from "../../types";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { getReportTypeLabel } from "../../utils/rapports";
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

function getBeneficiaireName(rapport: RapportRedige) {
  const dossier = rapport.beneficiaire.dossier;
  if (!dossier) return "Bénéficiaire";
  return `${dossier.nom} ${dossier.prenom}`;
}

function getBeneficiaireOptionLabel(beneficiaire: Beneficiaire) {
  const dossier = beneficiaire.dossier;
  if (!dossier) return beneficiaire.id;
  return `${dossier.nom} ${dossier.prenom} - ${dossier.numeroDossier}`;
}

function getRapportTitle(rapport: RapportRedige) {
  return rapport.titre || `Rapport ${getReportTypeLabel(rapport.type).toLowerCase()}`;
}

function valueOrNeant(value?: string | null) {
  const text = value?.trim();
  return text || "Néant";
}

function getSectionCells(ligne: string | string[] | { type?: string; cellules?: string[] }) {
  if (Array.isArray(ligne)) {
    return ligne;
  }

  if (typeof ligne === "object" && ligne.cellules) {
    return ligne.cellules;
  }

  return [String(ligne)];
}

function getSectionLineType(ligne: string | string[] | { type?: string; cellules?: string[] }) {
  return typeof ligne === "object" && !Array.isArray(ligne) ? ligne.type : undefined;
}

function getDraftFromRapport(rapport: RapportRedige): DraftRapportPayload {
  const draft = rapport.contenu?.draft;
  if (draft?.obligations?.length) {
    return {
      obligations: draft.obligations.map((obligation) => ({
        obligationId: obligation.obligationId,
        statut: obligation.statut === "NON_RESPECTEE" ? "NON_RESPECTEE" : "RESPECTEE",
        commentaire: obligation.commentaire ?? "",
      })),
      commentaireGeneral: draft.commentaireGeneral ?? "",
    };
  }

  const obligationsSection = rapport.contenu?.sections?.find((section) =>
    section.titre.toLowerCase().includes("obligation"),
  );

  return {
    obligations:
      obligationsSection?.lignes.map((_, index) => ({
        obligationId: `legacy-${index}`,
        statut: "RESPECTEE",
        commentaire: "",
      })) ?? [],
    commentaireGeneral: "",
  };
}

function sanitizePdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[()\\]/g, "\\$&");
}

function downloadRapportPdf(rapport: RapportRedige, attachments: BeneficiaireDocument[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const usableWidth = pageWidth - margin * 2;
  const bottomMargin = 42;
  const topY = 800;
  const pages: string[] = [];
  let commands: string[] = [];
  let y = topY;

  function newPage() {
    if (commands.length > 0) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    y = topY;
  }

  function ensureSpace(height: number) {
    if (y - height < bottomMargin) {
      newPage();
    }
  }

  function text(value: unknown, x: number, textY: number, size = 9) {
    commands.push(`BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${textY.toFixed(2)} Tm (${sanitizePdfText(value)}) Tj ET`);
  }

  function rect(x: number, rectY: number, width: number, height: number, fill = false) {
    commands.push(fill ? "0.95 g" : "0.82 G");
    commands.push(`${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${fill ? "f" : "S"}`);
    commands.push("0 g 0 G");
  }

  function wrapCell(value: unknown, width: number, size = 8) {
    const textValue = String(valueOrNeant(String(value ?? ""))).replace(/\s+/g, " ").trim();
    const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
    const words = textValue.split(" ");
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);
    return lines.length > 0 ? lines : ["Néant"];
  }

  function drawTable(headers: string[], rows: string[][], widths: number[]) {
    const rowLineHeight = 10;
    const padding = 4;
    const headerHeight = 18;

    ensureSpace(headerHeight + 20);
    let x = margin;
    headers.forEach((header, index) => {
      rect(x, y - headerHeight, widths[index], headerHeight, true);
      rect(x, y - headerHeight, widths[index], headerHeight);
      text(header.toUpperCase(), x + padding, y - 12, 7);
      x += widths[index];
    });
    y -= headerHeight;

    rows.forEach((row) => {
      const wrapped = row.map((cell, index) => wrapCell(cell, widths[index] - padding * 2, 8));
      const rowHeight = Math.max(20, Math.max(...wrapped.map((cellLines) => cellLines.length)) * rowLineHeight + padding * 2);
      ensureSpace(rowHeight);

      x = margin;
      wrapped.forEach((cellLines, index) => {
        rect(x, y - rowHeight, widths[index], rowHeight);
        cellLines.forEach((line, lineIndex) => {
          text(line, x + padding, y - padding - 8 - lineIndex * rowLineHeight, 8);
        });
        x += widths[index];
      });
      y -= rowHeight;
    });

    y -= 12;
  }

  function drawTitle(value: string) {
    ensureSpace(28);
    text(value.toUpperCase(), margin, y, 12);
    y -= 18;
  }

  function drawParagraph(value: string) {
    const lines = wrapCell(value, usableWidth, 9);
    ensureSpace(lines.length * 13 + 8);
    lines.forEach((line) => {
      text(line, margin, y, 9);
      y -= 13;
    });
    y -= 8;
  }

  text(getRapportTitle(rapport), margin, y, 13);
  y -= 16;
  text(`${getBeneficiaireName(rapport)} - ${formatDateTime(rapport.createdAt)}`, margin, y, 9);
  y -= 26;

  for (const section of rapport.contenu?.sections ?? []) {
    drawTitle(section.titre);

    const title = section.titre.toLowerCase();
    const isEvaluation = title.includes("evaluation") || title.includes("évaluation");
    const structuredRows = section.lignes.some(
      (ligne) => typeof ligne === "object" && !Array.isArray(ligne) && Array.isArray(ligne.cellules),
    );

    if (section.colonnes) {
      const columnCount = section.colonnes.length || 1;
      const widths = section.colonnes.map((_, index) => {
        if (columnCount === 3 && index === 1) return usableWidth * 0.58;
        if (columnCount === 3) return usableWidth * 0.21;
        return usableWidth / columnCount;
      });
      drawTable(section.colonnes, section.lignes.map((ligne) => getSectionCells(ligne).map(valueOrNeant)), widths);
    } else if (isEvaluation && structuredRows) {
      let currentEvaluation: string[] | null = null;
      let occurrences: string[][] = [];

      function flushEvaluation() {
        if (!currentEvaluation) return;
        drawTable(["Suivi", "Service", "Conformité"], [currentEvaluation], [usableWidth * 0.28, usableWidth * 0.44, usableWidth * 0.28]);
        text("Date et présence", margin, y, 8);
        y -= 12;
        drawTable(["Date", "Présence"], occurrences, [usableWidth * 0.28, usableWidth * 0.28]);
        currentEvaluation = null;
        occurrences = [];
      }

      section.lignes.forEach((ligne) => {
        const cells = getSectionCells(ligne).map(valueOrNeant);
        if (getSectionLineType(ligne) === "evaluation") {
          flushEvaluation();
          currentEvaluation = [cells[0], cells[1], cells[2]];
        } else {
          occurrences.push([cells[0], cells[1]]);
        }
      });
      flushEvaluation();
    } else {
      drawParagraph(section.texte ?? section.lignes.map((ligne) => getSectionCells(ligne).join(" - ")).join("\n"));
    }
  }

  if (attachments.length > 0) {
    drawTitle("Pièces jointes");
    drawTable(
      ["Nom du fichier", "Type"],
      attachments.map((document) => [
        document.titre || document.fileName || document.id,
        document.mimeType || document.typeDocument,
      ]),
      [usableWidth * 0.7, usableWidth * 0.3],
    );
  }

  if (commands.length > 0) {
    pages.push(commands.join("\n"));
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((pageContent, pageIndex) => {
    const pageObjectId = 3 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${pageContent.length} >>\nstream\n${pageContent}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getRapportTitle(rapport).replace(/[^a-z0-9-]+/gi, "_").toLowerCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function RapportsRedigesPage() {
  const { showToast } = useToast();
  const { items, loading, error, refetch } = useRapportsRediges();
  const {
    beneficiaires,
    loading: beneficiairesLoading,
    error: beneficiairesError,
  } = useBeneficiaires(1, 100);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRapportId, setSelectedRapportId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    beneficiaireId: "",
    type: "MENSUEL",
    periodeDu: "",
    periodeAu: "",
  });
  const [creating, setCreating] = useState(false);
  const [draftForm, setDraftForm] = useState<DraftRapportPayload>({ obligations: [] });
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingReportFiles, setUploadingReportFiles] = useState(false);
  const [reportAttachments, setReportAttachments] = useState<BeneficiaireDocument[]>([]);
  const [loadingReportAttachments, setLoadingReportAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((rapport) => {
      const dossier = rapport.beneficiaire.dossier;
      const haystack = [
        rapport.type,
        getReportTypeLabel(rapport.type),
        dossier?.nom ?? "",
        dossier?.prenom ?? "",
        dossier?.numeroDossier ?? "",
        rapport.titre ?? "",
        rapport.statut ?? "",
        rapport.generePar.nom,
        rapport.generePar.prenom,
      ]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [items, search]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [currentPage, filteredItems, limit]);

  const selectedRapport = useMemo(
    () => items.find((rapport) => rapport.id === selectedRapportId) ?? null,
    [items, selectedRapportId],
  );

  useEffect(() => {
    if (!selectedRapportId && items.length > 0) {
      setSelectedRapportId(items[0].id);
    }
  }, [items, selectedRapportId]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (selectedRapport) {
      setDraftForm(getDraftFromRapport(selectedRapport));
    }
  }, [selectedRapport]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttachments() {
      if (!selectedRapport) {
        setReportAttachments([]);
        return;
      }

      setLoadingReportAttachments(true);
      try {
        const res = await api.get<ApiResponse<BeneficiaireDocument[]>>(
          `/beneficiaires/${selectedRapport.beneficiaire.id}/documents`,
        );
        if (cancelled) return;
        setReportAttachments(
          res.data.filter(
            (document) =>
              document.typeDocument === "PIECE_JOINTE_RAPPORT" &&
              (document.description ?? "").includes(`rapport:${selectedRapport.id}`),
          ),
        );
      } catch {
        if (!cancelled) setReportAttachments([]);
      } finally {
        if (!cancelled) setLoadingReportAttachments(false);
      }
    }

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [selectedRapport]);

  async function handleCreatePrefilledRapport() {
    if (!createForm.beneficiaireId) {
      showToast("Sélectionne un bénéficiaire pour générer le rapport.", "error");
      return;
    }

    setCreating(true);
    try {
      const res = await createPrefilledRapport({
        beneficiaireId: createForm.beneficiaireId,
        type: createForm.type,
        periodeDu: createForm.periodeDu || undefined,
        periodeAu: createForm.periodeAu || undefined,
      });
      setSelectedRapportId(res.data.id);
      setCreateDrawerOpen(false);
      setDrawerOpen(true);
      setCreateForm({
        beneficiaireId: "",
        type: "MENSUEL",
        periodeDu: "",
        periodeAu: "",
      });
      showToast("Rapport généré avec succès.", "success");
      await refetch();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveDraft(finalize = false) {
    if (!selectedRapport) return;

    setSavingDraft(true);
    try {
      const payload = {
        ...draftForm,
        obligations: draftForm.obligations.filter((item) => !item.obligationId.startsWith("legacy-")),
      };
      const res = finalize
        ? await finalizeRapport(selectedRapport.id, payload)
        : await updateDraftRapport(selectedRapport.id, payload);
      setSelectedRapportId(res.data.id);
      showToast(finalize ? "Rapport finalisé avec succès." : "Brouillon enregistré.", "success");
      await refetch();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleReopenDraft() {
    if (!selectedRapport) return;
    setSavingDraft(true);
    try {
      const res = await reopenRapportDraft(selectedRapport.id);
      setSelectedRapportId(res.data.id);
      showToast("Rapport ouvert en modification.", "success");
      await refetch();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleReportFilesChange(files: FileList | null) {
    if (!selectedRapport || !files?.length) return;
    setUploadingReportFiles(true);
    try {
      for (const file of Array.from(files)) {
        const created = await api.post<{
          message: string;
          data: {
            document: BeneficiaireDocument;
            uploadPath: string;
          };
        }>(`/beneficiaires/${selectedRapport.beneficiaire.id}/documents`, {
          typeDocument: "PIECE_JOINTE_RAPPORT",
          titre: file.name,
          description: `rapport:${selectedRapport.id} - Pièce jointe du rapport ${getRapportTitle(selectedRapport)}`,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        await api.upload(
          created.data.uploadPath,
          file,
          file.type || "application/octet-stream",
        );
      }
      const res = await api.get<ApiResponse<BeneficiaireDocument[]>>(
        `/beneficiaires/${selectedRapport.beneficiaire.id}/documents`,
      );
      setReportAttachments(
        res.data.filter(
          (document) =>
            document.typeDocument === "PIECE_JOINTE_RAPPORT" &&
            (document.description ?? "").includes(`rapport:${selectedRapport.id}`),
        ),
      );
      showToast("Fichier(s) téléversé(s) avec succès.", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setUploadingReportFiles(false);
    }
  }

  async function handleDeleteAttachment(documentId: string) {
    setDeletingAttachmentId(documentId);
    try {
      await api.delete(`/documents/${documentId}`);
      setReportAttachments((current) => current.filter((document) => document.id !== documentId));
      showToast("Pièce jointe supprimée.", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  return (
    <div className="min-h-full bg-surface px-4 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/rapports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft size={15} />
            Retour à Rapports
          </Link>
          <h1 className="mt-3 text-[30px] font-extrabold text-[#17362e]">
            Rapports rédigés
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Production interne des agents et documents de synthèse associés aux bénéficiaires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e4d44]"
          >
            <Plus size={14} />
            Nouveau rapport
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-surface-high bg-white px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-surface-high bg-white p-4 shadow-[0_12px_35px_rgba(23,54,46,0.06)] sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-surface-high bg-surface-highest pl-9 pr-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
              placeholder="Rechercher par bénéficiaire, numéro de dossier ou type de rapport…"
            />
          </div>

          <div className="flex items-center gap-3">
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
        </div>

        {error ? (
          <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        ) : loading ? (
          <div className="flex min-h-64 items-center justify-center text-on-surface-variant">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-high bg-surface-low px-6 py-14 text-center">
            <FileBadge2 size={24} className="mx-auto text-outline-variant" />
            <p className="mt-4 text-sm font-semibold text-on-surface">
              Aucun rapport rédigé n’est disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_180px_140px_60px] items-center gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#17362e] md:grid">
              <span>Rapport</span>
              <span>Type / statut</span>
              <span>Rédigé par</span>
              <span>Date</span>
              <span className="text-right">Action</span>
            </div>
            {paginatedItems.map((rapport) => {
              const selected = selectedRapport?.id === rapport.id;
              return (
                <button
                  key={rapport.id}
                  type="button"
                  onClick={() => {
                    setSelectedRapportId(rapport.id);
                    setDrawerOpen(true);
                  }}
                  className={`grid w-full grid-cols-[minmax(0,1.5fr)_140px_180px_140px_60px] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-surface"
                      : "border-transparent bg-surface-low hover:border-surface-high hover:bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface">
                      {getRapportTitle(rapport)}
                    </p>
                    {/* <p className="mt-1 text-xs text-on-surface-variant">
                      {getBeneficiaireName(rapport)} • {rapport.beneficiaire.dossier?.numeroDossier ?? "—"}
                    </p> */}
                     <p className="mt-1 text-xs text-on-surface-variant">
                      {getBeneficiaireName(rapport)} • {rapport.beneficiaire.dossier?.numeroMandatDepot ?? "—"}
                    </p>
                    
                  </div>
                  <div>
                    <span className="mb-1 inline-flex rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2e4d44]">
                      {getReportTypeLabel(rapport.type)}
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {rapport.statut ?? "BROUILLON"}
                    </p>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {rapport.generePar.prenom} {rapport.generePar.nom}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {formatDateTime(rapport.createdAt)}
                  </div>
                  <div className="flex justify-end">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SideDrawer
        open={drawerOpen && !!selectedRapport}
        onClose={() => setDrawerOpen(false)}
        showCloseButton
        panelClassName="sm:max-w-[56rem] xl:max-w-[64rem]"
      >
        {selectedRapport ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 pr-12 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span className="mb-3 inline-block rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#2e4d44]">
                    Rapport rédigé
                  </span>
                  <h2 className="text-[30px] font-extrabold leading-tight text-[#17362e]">
                    {getRapportTitle(selectedRapport)}
                  </h2>
                  <p className="mt-2 text-sm text-[#414845]">
                    Rapport {getReportTypeLabel(selectedRapport.type).toLowerCase()} rédigé le {formatDateTime(selectedRapport.createdAt)} par {selectedRapport.generePar.prenom} {selectedRapport.generePar.nom}({selectedRapport.generePar.email}).
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {selectedRapport.statut === "BROUILLON" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSaveDraft(false)}
                        disabled={savingDraft}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#17362e] transition hover:bg-[#f2f4f3] disabled:opacity-60"
                      >
                        {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveDraft(true)}
                        disabled={savingDraft}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#17362e] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white transition hover:bg-[#2e4d44] disabled:opacity-60"
                      >
                        {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <FileBadge2 size={14} />}
                        Finaliser
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleReopenDraft()}
                        disabled={savingDraft}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#17362e] transition hover:bg-[#f2f4f3] disabled:opacity-60"
                      >
                        <Pencil size={14} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRapportPdf(selectedRapport, reportAttachments)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#17362e] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white transition hover:bg-[#2e4d44]"
                      >
                        <Download size={14} />
                        Exporter PDF
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Bénéficiaire
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {getBeneficiaireName(selectedRapport)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Numéro de dossier
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {valueOrNeant(selectedRapport.beneficiaire.dossier?.numeroDossier)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Numéro mandat
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {valueOrNeant(selectedRapport.beneficiaire.dossier?.numeroMandatDepot)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f3] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#17362e]">
                    Juridiction
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#191c1c]">
                    {valueOrNeant(selectedRapport.contenu?.resume?.juridiction)}
                  </p>
                </div>
              </div>

              {/* <div className="flex flex-wrap gap-2">
                {selectedRapport.statut === "BROUILLON" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft(false)}
                      disabled={savingDraft}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#17362e] transition hover:bg-[#f2f4f3] disabled:opacity-60"
                    >
                      {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft(true)}
                      disabled={savingDraft}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#17362e] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white transition hover:bg-[#2e4d44] disabled:opacity-60"
                    >
                      {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <FileBadge2 size={14} />}
                      Finaliser
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleReopenDraft()}
                      disabled={savingDraft}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#17362e] transition hover:bg-[#f2f4f3] disabled:opacity-60"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => openRapportPdf(selectedRapport)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#17362e] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white transition hover:bg-[#2e4d44]"
                    >
                      <Download size={14} />
                      Exporter PDF
                    </button>
                  </>
                )}
              </div> */}

              {/* <div className="rounded-xl border-l-4 border-[#17362e] bg-[#f2f4f3] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <UserRound size={14} className="text-[#17362e]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17362e]">
                    Informations de production
                  </p>
                </div>
                <p className="text-sm leading-7 text-[#191c1c]">
                  Ce rapport a été produit par {selectedRapport.generePar.prenom} {selectedRapport.generePar.nom}
                  {" "}({selectedRapport.generePar.email}) et rattaché au bénéficiaire concerné.
                </p>
              </div> */}

              {selectedRapport.statut === "BROUILLON" ? (
                <div className="space-y-3">
                  {selectedRapport.contenu?.sections?.map((section) => {
                    const title = section.titre.toLowerCase();
                    const isObligations = title.includes("obligation");
                    const isComments = title.includes("commentaire");
                    const isEvaluationSection = title.includes("évaluation") || title.includes("evaluation");
                    const hasStructuredRows = section.lignes.some((ligne) => typeof ligne === "object" && !Array.isArray(ligne) && Array.isArray(ligne.cellules));

                    return (
                      <div key={section.titre} className="rounded-lg border border-surface-high bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText size={14} className="text-[#17362e]" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#17362e]">
                            {section.titre}
                          </h3>
                        </div>

                        {isObligations ? (
                          <div className="overflow-hidden rounded-lg border border-surface-high">
                            <table className="w-full table-fixed text-left text-sm">
                              <thead className="bg-[#f2f4f3] text-[10px] font-black uppercase tracking-[0.14em] text-[#17362e]">
                                <tr>
                                  <th className="px-3 py-2">Catégorie</th>
                                  <th className="px-3 py-2">Obligation</th>
                                  <th className="px-3 py-2">Statut</th>
                                  <th className="px-3 py-2">Commentaire</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-high bg-white">
                                {(selectedRapport.contenu?.draft?.obligations ?? []).map((obligation, index) => (
                                  <tr key={obligation.obligationId}>
                                    <td className="bg-[#f8faf9] px-3 py-2 text-[#576662]">{obligation.categorie}</td>
                                    <td className="bg-[#f8faf9] px-3 py-2 text-[#576662]">{obligation.libelle}</td>
                                    <td className="px-3 py-2">
                                      <select
                                        value={draftForm.obligations[index]?.statut ?? "RESPECTEE"}
                                        onChange={(event) =>
                                          setDraftForm((current) => ({
                                            ...current,
                                            obligations: current.obligations.map((item, itemIndex) =>
                                              itemIndex === index
                                                ? { ...item, statut: event.target.value as "RESPECTEE" | "NON_RESPECTEE" }
                                                : item,
                                            ),
                                          }))
                                        }
                                        className="h-9 w-full rounded-md border border-surface-high bg-white px-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
                                      >
                                        <option value="RESPECTEE">Respecté</option>
                                        <option value="NON_RESPECTEE">Non respecté</option>
                                      </select>
                                    </td>
                                    <td className="px-3 py-2">
                                      <textarea
                                        value={draftForm.obligations[index]?.commentaire ?? ""}
                                        onChange={(event) =>
                                          setDraftForm((current) => ({
                                            ...current,
                                            obligations: current.obligations.map((item, itemIndex) =>
                                              itemIndex === index ? { ...item, commentaire: event.target.value } : item,
                                            ),
                                          }))
                                        }
                                        rows={2}
                                        className="w-full rounded-md border border-surface-high bg-white px-2 py-1 text-xs text-on-surface outline-none focus:border-primary"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : isComments ? (
                          <textarea
                            value={draftForm.commentaireGeneral ?? ""}
                            onChange={(event) =>
                              setDraftForm((current) => ({
                                ...current,
                                commentaireGeneral: event.target.value,
                              }))
                            }
                            rows={5}
                            className="w-full rounded-lg border border-surface-high bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                          />
                        ) : section.colonnes ? (
                          <div className="overflow-hidden rounded-lg border border-surface-high bg-[#f8faf9]">
                            <table className="w-full table-fixed text-left text-sm">
                              <thead className="bg-[#f2f4f3] text-[10px] font-black uppercase tracking-[0.16em] text-[#17362e]">
                                <tr>{section.colonnes.map((colonne) => <th key={colonne} className="px-3 py-2">{colonne}</th>)}</tr>
                              </thead>
                              <tbody className="divide-y divide-surface-high text-[#576662]">
                                {section.lignes.map((ligne, index) => (
                                  <tr key={`${section.titre}-${index}`}>
                                    {getSectionCells(ligne).map((cell, cellIndex) => (
                                      <td key={`${section.titre}-${index}-${cellIndex}`} className="px-3 py-2 align-top leading-5">
                                        {valueOrNeant(cell)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : isEvaluationSection && hasStructuredRows ? (
                          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-surface-high bg-white p-2">
                            <div className="grid grid-cols-3 gap-2 rounded-md bg-[#f2f4f3] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#17362e]">
                              <span>Suivi</span>
                              <span>Service</span>
                              <span>Conformité</span>
                            </div>
                            {section.lignes.map((ligne, index) => {
                              const cells = getSectionCells(ligne);
                              const lineType = getSectionLineType(ligne);
                              if (lineType === "evaluation") {
                                return (
                                  <div key={`${section.titre}-${index}`} className="space-y-1">
                                    <div className="grid grid-cols-3 gap-2 rounded-md bg-[#f8faf9] px-2 py-1.5 text-xs font-semibold text-[#576662]">
                                      <span>{valueOrNeant(cells[0])}</span>
                                      <span>{valueOrNeant(cells[1])}</span>
                                      <span>{valueOrNeant(cells[2])}</span>
                                    </div>
                                    <div className="ml-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#17362e]">
                                      Date et présence
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={`${section.titre}-${index}`} className="ml-3 grid max-w-sm grid-cols-2 items-center gap-2 rounded-md px-2 py-1 text-xs text-[#576662]">
                                  <span className="font-mono">{valueOrNeant(cells[0])}</span>
                                  <span className="text-right font-semibold">{valueOrNeant(cells[1])}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-surface-high bg-[#f8faf9] p-3 text-sm leading-6 text-[#576662]">
                            {section.texte ?? section.lignes.map((ligne) => getSectionCells(ligne).join(" - ")).join("\n")}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="rounded-lg border border-surface-high bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={14} className="text-[#17362e]" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#17362e]">
                        Pièces jointes
                      </h3>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={(event) => void handleReportFilesChange(event.target.files)}
                      disabled={uploadingReportFiles}
                      className="block w-full rounded-lg border border-surface-high bg-[#f8faf9] px-3 py-2 text-sm text-on-surface"
                    />
                    {uploadingReportFiles ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
                        <Loader2 size={13} className="animate-spin" />
                        Téléversement en cours...
                      </div>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      {loadingReportAttachments ? (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Loader2 size={13} className="animate-spin" />
                          Chargement des pièces jointes...
                        </div>
                      ) : reportAttachments.length > 0 ? (
                        reportAttachments.map((document) => (
                          <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-surface-high bg-[#f8faf9] px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-on-surface">{document.titre}</p>
                              <p className="truncate text-xs text-on-surface-variant">{document.fileName ?? document.mimeType ?? "Fichier"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`${API_BASE_URL}/documents/${document.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-primary hover:bg-surface-high"
                                title="Télécharger"
                              >
                                <Download size={14} />
                              </a>
                              <button
                                type="button"
                                onClick={() => void handleDeleteAttachment(document.id)}
                                disabled={deletingAttachmentId === document.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-error-container text-on-error-container hover:bg-error-container/80 disabled:opacity-60"
                                title="Supprimer"
                              >
                                {deletingAttachmentId === document.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed border-surface-high bg-surface-low px-3 py-2 text-xs text-on-surface-variant">
                          Aucune pièce jointe téléversée.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : selectedRapport.contenu?.sections ? (
                <div className="space-y-3">
                  {selectedRapport.contenu.sections.map((section) => {
                    const isEvaluationSection = section.titre.toLowerCase().includes("évaluation") || section.titre.toLowerCase().includes("evaluation");
                    const hasStructuredRows = section.lignes.some((ligne) => typeof ligne === "object" && !Array.isArray(ligne) && Array.isArray(ligne.cellules));
                    return (
                    <div
                      key={section.titre}
                      className={`rounded-lg border p-4 ${
                        section.tone === "ALERTE"
                          ? "border-error/20 bg-error/10"
                          : "border-surface-high bg-white"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-[#17362e]" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#17362e]">
                          {section.titre}
                        </h3>
                      </div>
                      {section.texte ? (
                        <div className="min-h-24 rounded-lg border border-surface-high bg-[#f8faf9] p-3 text-sm leading-6 text-[#191c1c]">
                          {section.texte}
                        </div>
                      ) : section.colonnes ? (
                        <div className="overflow-hidden rounded-lg border border-surface-high">
                          <table className="w-full table-fixed text-left text-sm">
                            <thead className="bg-[#f2f4f3] text-[10px] font-black uppercase tracking-[0.16em] text-[#17362e]">
                              <tr>
                                {section.colonnes.map((colonne) => (
                                  <th key={colonne} className="px-3 py-2">
                                    {colonne}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-high bg-white text-[#191c1c]">
                              {section.lignes.map((ligne, index) => (
                                <tr key={`${section.titre}-${index}`}>
                                  {getSectionCells(ligne).map((cell, cellIndex) => (
                                    <td key={`${section.titre}-${index}-${cellIndex}`} className="px-3 py-2 align-top leading-5">
                                      {valueOrNeant(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : isEvaluationSection && hasStructuredRows ? (
                        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-surface-high bg-white p-2">
                          <div className="grid grid-cols-3 gap-2 rounded-md bg-[#f2f4f3] px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#17362e]">
                            <span>Suivi</span>
                            <span>Service</span>
                            <span>Conformité</span>
                          </div>
                          {section.lignes.map((ligne, index) => {
                            const cells = getSectionCells(ligne);
                            const lineType = getSectionLineType(ligne);
                            if (lineType === "evaluation") {
                              return (
                                <div key={`${section.titre}-${index}`} className="space-y-1">
                                  <div className="grid grid-cols-3 gap-2 rounded-md bg-[#f2f4f3] px-2 py-1.5 text-xs font-semibold text-[#191c1c]">
                                    <span>{valueOrNeant(cells[0])}</span>
                                    <span>{valueOrNeant(cells[1])}</span>
                                    <span>{valueOrNeant(cells[2])}</span>
                                  </div>
                                  <div className="ml-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#17362e]">
                                    Date et présence
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={`${section.titre}-${index}`} className="ml-3 grid max-w-sm grid-cols-2 items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs text-[#191c1c]">
                                <span className="font-mono">{valueOrNeant(cells[0])}</span>
                                <span className="text-right font-semibold">{valueOrNeant(cells[1])}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {section.lignes.map((ligne, index) => (
                            <li key={`${section.titre}-${index}`} className="text-sm leading-6 text-[#191c1c]">
                              {getSectionCells(ligne).join(" - ")}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )})}
                  <div className="rounded-lg border border-surface-high bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={14} className="text-[#17362e]" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#17362e]">
                        Pièces jointes
                      </h3>
                    </div>
                    {loadingReportAttachments ? (
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Loader2 size={13} className="animate-spin" />
                        Chargement des pièces jointes...
                      </div>
                    ) : reportAttachments.length > 0 ? (
                      <div className="space-y-2">
                        {reportAttachments.map((document) => (
                          <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-surface-high bg-[#f8faf9] px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-on-surface">{document.titre}</p>
                              <p className="truncate text-xs text-on-surface-variant">{document.fileName ?? document.mimeType ?? "Fichier"}</p>
                            </div>
                            <a
                              href={`${API_BASE_URL}/documents/${document.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-primary hover:bg-surface-high"
                              title="Télécharger"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-surface-high bg-surface-low px-3 py-2 text-xs text-on-surface-variant">
                        Aucune pièce jointe associée à ce rapport.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <Link
                  to={`/beneficiaires/${selectedRapport.beneficiaire.id}`}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#17362e] to-[#2e4d44] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.28em] text-white shadow-md transition hover:brightness-110"
                >
                  Ouvrir bénéficiaire
                </Link>
                {selectedRapport.fichierUrl ? (
                  <a
                    href={selectedRapport.fichierUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#17362e] bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#17362e] transition hover:bg-[#f2f4f3]"
                  >
                    Ouvrir le fichier du rapport
                  </a>
                ) : (
                  <div className="rounded-lg border border-dashed border-surface-high bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                    Aucun fichier de rapport n’est encore associé à cette entrée.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SideDrawer>

      <SideDrawer open={createDrawerOpen} onClose={() => setCreateDrawerOpen(false)} showCloseButton>
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="pr-12">
            <span className="mb-3 inline-block rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#2e4d44]">
              Pré-remplissage
            </span>
            <h2 className="text-[30px] font-extrabold leading-tight text-[#17362e]">
              Nouveau rapport
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#414845]">
              Le rapport sera préparé à partir du dossier, des obligations, des pointages, des alertes, des évaluations externes et des documents disponibles.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {beneficiairesError ? (
              <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                {beneficiairesError}
              </div>
            ) : null}

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Bénéficiaire
              </span>
              <select
                value={createForm.beneficiaireId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    beneficiaireId: event.target.value,
                  }))
                }
                disabled={beneficiairesLoading}
                className="mt-2 h-11 w-full rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Sélectionner un bénéficiaire</option>
                {beneficiaires.map((beneficiaire) => (
                  <option key={beneficiaire.id} value={beneficiaire.id}>
                    {getBeneficiaireOptionLabel(beneficiaire)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Type de rapport
              </span>
              <select
                value={createForm.type}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                className="mt-2 h-11 w-full rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="MENSUEL">Mensuel</option>
                <option value="URGENCE">Urgence</option>
                <option value="VISITE">Visite</option>
                <option value="EVALUATION">Évaluation</option>
                <option value="GENERAL">Général</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Début
                </span>
                <input
                  type="date"
                  value={createForm.periodeDu}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      periodeDu: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Fin
                </span>
                <input
                  type="date"
                  value={createForm.periodeAu}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      periodeAu: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleCreatePrefilledRapport()}
              disabled={creating}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#17362e] to-[#2e4d44] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <FileBadge2 size={15} />}
              Générer le brouillon
            </button>
          </div>
        </div>
      </SideDrawer>
    </div>
  );
}
