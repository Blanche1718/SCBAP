import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Check,
  ArrowUpRight,
  X,
  LayoutGrid,
  AlignLeft,
  Shield,
  MapPin,
  Activity,
  Loader2,
  AlertCircle,
  Eye,
  Pencil,
  Lock,
  FileText,
  FolderOpen,
  Upload,
} from "lucide-react";
import { useBeneficiaire } from "../../hooks/useBeneficiaires";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { useToast } from "../../context/ToastContext";
import { API_BASE_URL, api } from "../../lib/api";
import type {
  ApiResponse,
  Document as BeneficiaireDocument,
  EvaluationRecue,
  Obligation,
  Beneficiaire,
} from "../../types";
import { formatInAppTimeZone, formatPointageInAppTimeZone } from "../../utils/timezone";
import { getConformiteLabel, getConformiteTone } from "../../utils/rapports";
import { useRapportsRediges } from "../../hooks/useRapports";
import { getDapgRawObligationsText } from "../../utils/dapgObligations";

type ObligationFormState = {
  type: string;
  frequence: string;
  jourSemaine: string;
  heure: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  raisonModification: string;
  raisonAutre: string;
};


// const MODIFICATION_REASONS = [
//   { value: "NON_CONFORME", label: "Non conforme" },
//   { value: "ORDONNE_PAR_DAPG", label: "Modification ordonnée par la DAPG" },
//   { value: "AUTRE", label: "Autres" },
// ] as const;
type DetailSection = "OBLIGATIONS" | "HISTORIQUE" | "RAPPORTS" | "DOCUMENTS";
type BiometrieStatusLocal = "AUCUN" | "EN_COURS" | "CONFIRME" | "ECHEC";

function formatLastPointage(dateHeure?: string | null) {
  if (!dateHeure) return "—";
  return formatPointageInAppTimeZone(dateHeure, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatInAppTimeZone(parsed, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const parts = value.split("T");
  if (parts.length < 2) return value;
  return parts[1].slice(0, 5);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const parts = value.split("T");
  return parts[0] ?? "";
}

function toTimeInput(value?: string | null) {
  if (!value) return "";
  const parts = value.split("T");
  if (parts.length >= 2) return parts[1].slice(0, 5);
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return "";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-5">
      <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function isNewBeneficiaire(beneficiaire: {
  profilStatut?: "A_CONFIGURER" | "ACTIF" | "REVOQUE";
  profilConfirme?: boolean;
  dossier?: { othersData?: { source?: string } | null; createdAt?: string } | null;
}) {
  const dossier = beneficiaire.dossier;
  if ((beneficiaire.profilStatut ?? (beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER")) !== "A_CONFIGURER") return false;
  if (!dossier || dossier.othersData?.source !== "dapg") return false;
  if (!dossier.createdAt) return false;

  const createdAt = new Date(dossier.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  return Date.now() - createdAt.getTime() < 72 * 60 * 60 * 1000;
}

function formatCreatedAt(dateStr?: string | null) {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getDocumentTitle(item: Record<string, unknown>, fallback: string) {
  return (
    asText(item.titre) ??
    asText(item.nom) ??
    asText(item.libelle) ??
    asText(item.type_document) ??
    asText(item.type) ??
    fallback
  );
}

function looksLikeDocumentLink(value: string) {
  return (
    /^(https?:)?\/\//i.test(value) ||
    /\.(pdf|doc|docx|png|jpe?g)(\?|#|$)/i.test(value) ||
    /^\/.*(document|download|fichier|file|media|storage|uploads|arrete|arr[êe]te)/i.test(value)
  );
}

function findDocumentLink(value: unknown): string | undefined {
  const text = asText(value);
  if (text && looksLikeDocumentLink(text)) {
    return text;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return Object.values(record)
    .map((item) => findDocumentLink(item))
    .find(Boolean);
}

function getDocumentLink(record: Record<string, unknown>): string | undefined {
  const directLink =
    asText(record.url) ??
    asText(record.url_arrete) ??
    asText(record.arrete_url) ??
    asText(record.document_url) ??
    asText(record.download_url) ??
    asText(record.telechargement_url) ??
    asText(record.pdf_url) ??
    asText(record.lien) ??
    asText(record.lien_document) ??
    asText(record.file_url) ??
    asText(record.fichier_url) ??
    asText(record.fichier) ??
    asText(record.path) ??
    asText(record.chemin);

  if (directLink) {
    return directLink;
  }

  const nestedLink: string | undefined = [
    asRecord(record.document),
    asRecord(record.file),
    asRecord(record.fichier),
    asRecord(record.piece_jointe),
    asRecord(record.pieceJointe),
  ]
    .map((item) => (item ? getDocumentLink(item) : undefined))
    .find(Boolean);

  return nestedLink ?? findDocumentLink(record);
}

function resolveDocumentHref(href?: string) {
  if (!href) return undefined;
  if (/^(https?:)?\/\//i.test(href) || /^(blob|data):/i.test(href)) return href;
  return href.startsWith("/") ? `${API_BASE_URL}${href}` : href;
}

function extractDocumentCards(othersData?: Record<string, unknown> | null) {
  const cards: Array<{
    title: string;
    kind: string;
    subtitle?: string;
    href?: string;
    previewUrl?: string;
    mimeType?: string;
  }> = [];

  const arrete = asRecord(othersData?.arrete);
  if (arrete) {
    const href = resolveDocumentHref(getDocumentLink(arrete) ?? findDocumentLink(othersData));
    cards.push({
      title: getDocumentTitle(arrete, "Arrêté ministériel"),
      kind: "Arrêté",
      subtitle:
        [asText(arrete.statut), asText(arrete.date_signature), asText(arrete.date_arrete)]
          .filter(Boolean)
          .join(" • ") || undefined,
      href,
      previewUrl: href,
    });
  }

  const tousArretes = Array.isArray(othersData?.tousArretes) ? (othersData?.tousArretes as unknown[]) : [];
  tousArretes.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const href = resolveDocumentHref(getDocumentLink(record));
    cards.push({
      title: getDocumentTitle(record, `Arrêté ${index + 1}`),
      kind: "Arrêté",
      subtitle:
        [asText(record.statut), asText(record.date_signature), asText(record.date_arrete)]
          .filter(Boolean)
          .join(" • ") || undefined,
      href,
      previewUrl: href,
    });
  });

  const justificatifs = Array.isArray(othersData?.documentsJustificatifs)
    ? (othersData?.documentsJustificatifs as unknown[])
    : [];
  justificatifs.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const href = resolveDocumentHref(getDocumentLink(record));
    cards.push({
      title: getDocumentTitle(record, `Document ${index + 1}`),
      kind: asText(record.type_document) ?? asText(record.type) ?? "Justificatif",
      subtitle:
        [asText(record.date), asText(record.created_at), asText(record.createdAt)]
          .filter(Boolean)
          .join(" • ") || undefined,
      href,
      previewUrl: href,
    });
  });

  return cards;
}

type ComplianceStatus = "NON_CONFORME" | "ACTIF" | "TERMINE" | "A_CONFIGURER";
type RiskLevel = "Faible" | "Moyen" | "Eleve";

function getProfilStatut(beneficiaire: Beneficiaire) {
  return beneficiaire.profilStatut ?? (beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER");
}

function getComplianceStatus(beneficiaire: Beneficiaire): ComplianceStatus {
  const dossierStatut = beneficiaire.dossier?.statut;
  if (dossierStatut === "REVOQUE") return "NON_CONFORME";
  if (dossierStatut === "TERMINE") return "TERMINE";
  return getProfilStatut(beneficiaire) === "ACTIF" ? "ACTIF" : "A_CONFIGURER";
}

function getRiskLevel(beneficiaire: Beneficiaire): RiskLevel {
  const dossierStatut = beneficiaire.dossier?.statut;
  if (dossierStatut === "REVOQUE") return "Eleve";
  if (dossierStatut === "TERMINE") return "Faible";
  return "Moyen";
}

function hasElectronicMonitoring(obligations?: Obligation[]) {
  return (obligations ?? []).some((obligation) => {
    const haystack = [
      obligation.type,
      obligation.description,
      obligation.categorie?.nom,
      obligation.libelle,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      haystack.includes("bracelet") ||
      haystack.includes("electronique") ||
      haystack.includes("électronique") ||
      haystack.includes("gps") ||
      haystack.includes("surveillance")
    );
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
          ? "A CONFIGURER"
        : "ACTIF";

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${styles}`}>
      {label}
    </span>
  );
}

function mapStoredDocument(document: BeneficiaireDocument) {
  const downloadPath = document.downloadUrl
    ? `${API_BASE_URL}${document.downloadUrl}`
    : `${API_BASE_URL}/documents/${document.id}/download`;

  return {
    title: document.titre,
    kind: document.typeDocument,
    subtitle:
      [
        document.statut,
        document.uploadedAt ? formatCreatedAt(document.uploadedAt) : formatCreatedAt(document.createdAt),
      ]
        .filter(Boolean)
        .join(" • ") || undefined,
    href: downloadPath,
    previewUrl: downloadPath,
    mimeType: document.mimeType ?? undefined,
  };
}

export default function BeneficiaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { beneficiaire, loading, error, refetch } = useBeneficiaire(id);
  const { items: rapportsRediges } = useRapportsRediges();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<DetailSection>("OBLIGATIONS");
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [documentNotice, setDocumentNotice] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const [documentDrawerOpen, setDocumentDrawerOpen] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationRecue[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [evaluationDrawerOpen, setEvaluationDrawerOpen] = useState(false);
  const [selectedRapportId, setSelectedRapportId] = useState<string | null>(null);
  const [rapportDrawerOpen, setRapportDrawerOpen] = useState(false);
  const [biometrieLoading, setBiometrieLoading] = useState(false);
  const [biometrieNotice, setBiometrieNotice] = useState<string | null>(null);
  const [biometrieError, setBiometrieError] = useState<string | null>(null);
  const biometriePollingRef = useRef<number | null>(null);
  const [documentForm, setDocumentForm] = useState({
    typeDocument: "JUSTIFICATIF",
    titre: "",
    description: "",
    file: null as File | null,
  });
  const [form, setForm] = useState<ObligationFormState>({
    type: "",
    frequence: "",
    jourSemaine: "",
    heure: "",
    lieu: "",
    dateDebut: "",
    dateFin: "",
    description: "",
    raisonModification: "",
    raisonAutre: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluations() {
      if (!id) {
        return;
      }

      try {
        setEvaluationsLoading(true);
        setEvaluationsError(null);
        const res = await api.get<ApiResponse<EvaluationRecue[]>>(`/beneficiaires/${id}/evaluations`);

        if (cancelled) {
          return;
        }

        setEvaluations(res.data);
        setSelectedEvaluationId((current) => current ?? res.data[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setEvaluationsError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setEvaluationsLoading(false);
        }
      }
    }

    void loadEvaluations();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Nettoyage automatique des messages temporaires (succès et erreurs)
  useEffect(() => {
    const messages = [
      { val: documentNotice, set: setDocumentNotice },
      { val: documentError, set: setDocumentError },
      { val: saveError, set: setSaveError },
      { val: biometrieNotice, set: setBiometrieNotice },
      { val: biometrieError, set: setBiometrieError },
    ];

    const timers = messages.map(({ val, set }) => {
      if (val) return window.setTimeout(() => set(null), 5000);
      return null;
    });

    return () => timers.forEach(t => t && window.clearTimeout(t));
  }, [documentNotice, documentError, saveError, biometrieNotice, biometrieError]);

  useEffect(() => {
    if (biometriePollingRef.current) {
      window.clearInterval(biometriePollingRef.current);
      biometriePollingRef.current = null;
    }

    const biometrieStatut = beneficiaire?.biometrieEnrolementStatut ?? "AUCUN";
    const biometrieCode = beneficiaire?.biometrieEnrolementCode?.trim();

    if (!beneficiaire || biometrieStatut !== "EN_COURS" || !biometrieCode) {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await api.get<{
          message: string;
          data: {
            code: string;
            isValid: boolean;
            success: boolean;
            statusLocal: BiometrieStatusLocal;
            message: string;
          };
        }>(`/biometrie/${encodeURIComponent(biometrieCode)}/status`);

        if (cancelled) return;

        if (response.data.statusLocal === "CONFIRME") {
          setBiometrieNotice("Biométrie configurée avec succès.");
          setBiometrieError(null);
          showToast("Biométrie configurée avec succès.", "success");
          await refetch();
          if (biometriePollingRef.current) {
            window.clearInterval(biometriePollingRef.current);
            biometriePollingRef.current = null;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setBiometrieError((err as Error).message);
        showToast((err as Error).message, "error");
      }
    };

    void checkStatus();

    biometriePollingRef.current = window.setInterval(() => {
      void checkStatus();
    }, 60000);

    return () => {
      cancelled = true;
      if (biometriePollingRef.current) {
        window.clearInterval(biometriePollingRef.current);
        biometriePollingRef.current = null;
      }
    };
  }, [beneficiaire, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-on-surface-variant">
        <Loader2 size={18} className="animate-spin text-primary" />
        <span className="text-sm">Chargement…</span>
      </div>
    );
  }

  if (error || !beneficiaire) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-error-container text-on-error-container">
          <AlertCircle size={15} />
          <p className="text-sm font-medium">{error || "Beneficiaire introuvable"}</p>
        </div>
      </div>
    );
  }

  const dossier = beneficiaire.dossier;
  const rawObligationsText = getDapgRawObligationsText(dossier);
  const fullName = dossier ? `${dossier.nom} ${dossier.prenom}` : "—";
  const profilConfirme = getProfilStatut(beneficiaire) === "ACTIF";
  const biometrieStatut = beneficiaire.biometrieEnrolementStatut ?? "AUCUN";
  const biometrieCode = beneficiaire.biometrieEnrolementCode?.trim() || null;
  const biometrieConfirmee = biometrieStatut === "CONFIRME";
  const biometrieEnCours = biometrieStatut === "EN_COURS";
  
  const complianceStatus = getComplianceStatus(beneficiaire);
  const riskLevel = getRiskLevel(beneficiaire);

  const lastPointage =
    beneficiaire.pointages?.find((pointage) => pointage.statut !== "ABSENT")?.dateHeure ?? null;
  const storedDocumentCards = (beneficiaire.documents ?? []).map(mapStoredDocument);
  const documentCards = [
    ...storedDocumentCards,
    ...extractDocumentCards(dossier?.othersData ?? null),
  ];
  const orderedObligations = [...(beneficiaire.obligations ?? [])].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.id || "").localeCompare(b.id || "");
  });
  const newBeneficiaire = isNewBeneficiaire(beneficiaire);
  const selectedEvaluation = evaluations.find((item) => item.id === selectedEvaluationId) ?? null;
  const beneficiaryRapports = rapportsRediges.filter((rapport) => rapport.beneficiaire.id === id);
  const selectedRapport = beneficiaryRapports.find((rapport) => rapport.id === selectedRapportId) ?? null;
  const electronicMonitoringEnabled = hasElectronicMonitoring(beneficiaire.obligations);
  const detailTabs = [
    { key: "OBLIGATIONS" as const, label: "Obligations", icon: Shield },
    { key: "HISTORIQUE" as const, label: "Historique de conformité", icon: Activity },
    { key: "RAPPORTS" as const, label: "Rapports & Évals", icon: AlignLeft },
    { key: "DOCUMENTS" as const, label: "Documents", icon: FileText },
  ];

  function handleOpenModify(obligation: Obligation) {
    if (profilConfirme) {
      setSaveError("Le profil est deja confirme, les obligations sont verrouillees.");
      showToast("Le profil est deja confirme, les obligations sont verrouillees.", "error");
      return;
    }
    setSelectedObligation(obligation);
    const frequence = obligation.frequence ?? "";
    setForm({
      type: obligation.type ?? "",
      frequence,
      jourSemaine: frequence === "QUOTIDIEN" ? "" : obligation.jourSemaine ?? "",
      heure: toTimeInput(obligation.heure ?? undefined),
      lieu: obligation.lieu ?? "",
      dateDebut: toDateInput(obligation.dateDebut ?? undefined),
      dateFin: toDateInput(obligation.dateFin ?? undefined),
      description: obligation.description ?? "",
      raisonModification: obligation.raisonModification ?? "",
      raisonAutre: obligation.raisonAutre ?? "",
    });
    setSaveError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedObligation(null);
    setSaveError(null);
  }

  async function handleConfirmProfil() {
    try {
      setSaving(true);
      setSaveError(null);
      await api.patch(`/beneficiaires/${id}/profil/confirmer`, {});
      await refetch();
    } catch (err) {
      setSaveError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfigurerBiometrie() {
    if (!id) {
      setBiometrieError("Identifiant de beneficiaire invalide.");
      showToast("Identifiant de beneficiaire invalide.", "error");
      return;
    }

    try {
      setBiometrieLoading(true);
      setBiometrieError(null);
      setBiometrieNotice(null);

      const response = await api.post<{
        message: string;
        data: {
          beneficiaireId: string;
          code: string;
          deepLinkFamoco: string | null;
          isValid: boolean;
          success: boolean;
          statusLocal: "AUCUN" | "EN_COURS" | "CONFIRME" | "ECHEC";
          message: string;
        };
      }>("/biometrie/enrolement", {
        beneficiaireId: id,
      });

      if (response.data.statusLocal === "CONFIRME") {
        setBiometrieNotice("Biométrie configurée avec succès.");
        setBiometrieError(null);
        showToast("Biométrie configurée avec succès.", "success");
      } else {
        setBiometrieNotice("Enrôlement biométrique lancé. Suivi de confirmation en cours.");
        showToast("Enrôlement biométrique lancé. Suivi de confirmation en cours.", "info");
      }
      await refetch();
    } catch (err) {
      setBiometrieError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setBiometrieLoading(false);
    }
  }

  async function handleDocumentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) {
      setDocumentError("Identifiant de bénéficiaire invalide.");
      showToast("Identifiant de bénéficiaire invalide.", "error");
      return;
    }

    if (!documentForm.typeDocument.trim()) {
      setDocumentError("Le type de document est requis.");
      showToast("Le type de document est requis.", "error");
      return;
    }

    if (!documentForm.titre.trim()) {
      setDocumentError("Le titre du document est requis.");
      showToast("Le titre du document est requis.", "error");
      return;
    }

    if (!documentForm.file) {
      setDocumentError("Choisis un fichier avant de téléverser.");
      showToast("Choisis un fichier avant de téléverser.", "error");
      return;
    }

    try {
      setDocumentUploading(true);
      setDocumentNotice(null);
      setDocumentError(null);

      const created = await api.post<
        {
          message: string;
          data: {
            document: BeneficiaireDocument;
            uploadPath: string;
          };
        }
      >(`/beneficiaires/${id}/documents`, {
        typeDocument: documentForm.typeDocument,
        titre: documentForm.titre,
        description: documentForm.description,
        fileName: documentForm.file.name,
        mimeType: documentForm.file.type || "application/octet-stream",
        sizeBytes: documentForm.file.size,
      });

      await api.upload(
        created.data.uploadPath,
        documentForm.file,
        documentForm.file.type || "application/octet-stream",
      );

      setDocumentForm({
        typeDocument: "JUSTIFICATIF",
        titre: "",
        description: "",
        file: null,
      });
      setDocumentInputKey((value) => value + 1);
      setDocumentNotice("Document televerse avec succes.");
      showToast("Document televerse avec succes.", "success");
      setDocumentDrawerOpen(false);
      await refetch();
    } catch (error) {
      setDocumentError((error as Error).message);
      showToast((error as Error).message, "error");
    } finally {
      setDocumentUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedObligation || profilConfirme) {
      if (profilConfirme) {
        setSaveError("Le profil est deja confirme, les obligations sont verrouillees.");
      }
      return;
    }

    const payload = {
      type: form.type || undefined,
      frequence: form.frequence || undefined,
      jour_semaine: form.frequence === "QUOTIDIEN" ? undefined : form.jourSemaine || undefined,
      heure: form.heure || undefined,
      lieu: form.lieu || undefined,
      date_debut: form.dateDebut || undefined,
      date_fin: form.dateFin || undefined,
      description: form.description || undefined,
      raison_modification: form.raisonModification || undefined,
      raison_autre:
        form.raisonModification === "AUTRE" ? form.raisonAutre || undefined : undefined,
      statut_structuration: "VALIDE",
    };

    try {
      setSaving(true);
      setSaveError(null);
      await api.put(`/obligations/${selectedObligation.id}`, payload);
      await refetch();
      handleCloseModal();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/beneficiaires"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={14} />
            Beneficiaires
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="text-sm font-semibold text-on-surface truncate">{fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            <Bell size={16} />
          </button>
          <Link
            to="/rapports/rediges"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-on-error-container bg-error-container hover:bg-error-container/80 transition-colors uppercase tracking-wider flex-1 sm:flex-none"
          >
            <AlertTriangle size={14} />
            Alerte d&apos;urgence
          </Link>
        </div>
      </div>

      {newBeneficiaire && (
        <div className="mb-6 rounded-lg border border-primary-fixed bg-[#eef8f4] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#ffe9c7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6b3d00]">
                  Nouveau
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-error-container">
                  <AlertTriangle size={10} />
                  A configurer
                </span>
              </div>
              <h2 className="mt-3 text-sm font-bold text-primary">
                Nouveau beneficiaire importé depuis la DAPG
              </h2>
              <p className="mt-1 text-sm text-on-secondary-container">
                Ce profil vient d&apos;être généré automatiquement. Vérifiez les informations, complètez les champs manquants et validez les obligations structurées.
              </p>
            </div>
            <div className="rounded-md bg-white px-3 py-2 text-xs font-medium text-on-secondary-container">
              Importé le {formatCreatedAt(dossier?.createdAt)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-lg bg-white overflow-hidden">
            <div className="h-24 bg-primary" />
            <div className="p-5 -mt-8">
              <div className="w-16 h-16 rounded-lg bg-surface-high text-primary flex items-center justify-center text-lg font-bold">
                {fullName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase() || "—"}
              </div>
              <h1 className="text-lg font-bold text-on-surface mt-3 truncate">{fullName}</h1>
              <p className="text-xs text-on-secondary-container font-mono mt-1">
                {dossier?.numeroMandatDepot ?? "—"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-on-secondary-container">
                <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Statut du beneficiaire</p>
                  <div className="mt-1">
                    <StatusBadge
                      status={
                        getProfilStatut(beneficiaire) === "ACTIF"
                          ? "ACTIF"
                          : getProfilStatut(beneficiaire) === "REVOQUE"
                            ? "NON_CONFORME"
                            : "A_CONFIGURER"
                        }
                      />
                    </div>
                  </div>
                <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Biométrie</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {biometrieConfirmee ? (
                      <span className="inline-flex items-center rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2e4d44]">
                        Configuré
                      </span>
                    ) : biometrieEnCours ? (
                      <span className="inline-flex items-center rounded-full bg-[#ffe9c7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#6b3d00]">
                        En cours
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfigurerBiometrie}
                        disabled={biometrieLoading}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#2e4d44] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {biometrieLoading ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Shield size={11} />
                        )}
                        Configurer
                      </button>
                    )}
                  </div>
                  {biometrieCode && (
                    <div className="mt-2 w-full rounded-md bg-surface-high px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Code de la biometrie
                      </p>
                      <p className="mt-1 w-full break-all font-mono text-xs font-bold text-on-surface">
                        {biometrieCode}
                      </p>
                    </div>
                  )}
                </div>
                {/* <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Risque</p>
                  <p className="text-sm font-semibold text-on-surface">{riskLevel}</p>
                </div> */}
                {/* <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Statut du suivi</p>
                  <p className="text-sm font-semibold text-on-surface">{beneficiaire.statut}</p>
                </div> */}
                {/* <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">QR Code</p>
                  <p className="text-xs font-mono text-on-surface">{beneficiaire.qrCode}</p>
                </div> */}
              </div>
            </div>

            {(biometrieNotice || biometrieError) && (
              <div className="mt-4 space-y-2">
                {biometrieNotice && (
                  <div className="rounded-md bg-primary-fixed/40 px-3 py-2 text-xs font-medium text-[#2e4d44]">
                    {biometrieNotice}
                  </div>
                )}
                {biometrieError && (
                  <div className="rounded-md bg-error-container px-3 py-2 text-xs font-medium text-on-error-container">
                    {biometrieError}
                  </div>
                )}
              </div>
            )}
          </div>

          {electronicMonitoringEnabled && (
          <Section title="Boucle GPS récente">
            <Link
              to="/surveillance"
              className="rounded-md h-36 flex items-center justify-center relative overflow-hidden bg-[linear-gradient(135deg,#0f2620_0%,#17362e_100%)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Ouvrir la page de surveillance GPS"
            >
              <MapPin size={18} className="text-primary-fixed z-10" />
              <div
                className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_12px,#c7eade_12px,#c7eade_13px),repeating-linear-gradient(90deg,transparent,transparent_12px,#c7eade_12px,#c7eade_13px)]"
              />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <span className="text-[10px] font-bold text-primary-fixed/70 tracking-widest uppercase">
                  Suivi actif
                </span>
              </div>
            </Link>
            {/* <p className="text-xs text-on-secondary-container mt-3">
              Dernière position connue : Zone 4
            </p> */}
          </Section>
          )}

          {rawObligationsText && (
            <Section title="Obligations (texte brut DAPG)">
              <div className="rounded-md border border-surface-low bg-white p-3">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-error-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-error-container">
                  Exigences légales
                </div>
                <p className="whitespace-pre-wrap text-xs text-on-secondary-container leading-relaxed">
                  {rawObligationsText}
                </p>
                {/* <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container">
                  <span className="w-2 h-2 rounded-full bg-on-error-container" />
                  Validation par l&apos;agent requise
                </div> */}
              </div>
            </Section>
          )}
            
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-lg bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="grid grid-cols-2 sm:flex items-center gap-x-4 gap-y-6 sm:gap-6 text-xs text-on-secondary-container">
              <div>
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Conformité</p>
                <p className="text-sm font-semibold text-on-surface">{complianceStatus.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Risque</p>
                <p className="text-sm font-semibold text-on-surface">{riskLevel}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Dernier pointage</p>
                <p className="text-sm font-semibold text-on-surface">
                  {formatLastPointage(lastPointage)}
                </p>
              </div>
            </div>
            {/* <div className="flex flex-col xs:flex-row items-stretch gap-2">
              <button className="px-3 py-2 rounded-md bg-surface-low text-xs font-bold text-[#2e4d44] hover:bg-surface-high transition-colors whitespace-nowrap">
                Mettre à jour le risque
              </button> 
              <button className="px-3 py-2 rounded-md bg-primary text-xs font-bold text-white hover:bg-[#2e4d44] transition-colors whitespace-nowrap">
                Ajouter un rapport
              </button>
            </div> */}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {detailTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSection(tab.key)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-primary-fixed text-[#2e4d44]"
                      : "bg-surface-low text-on-secondary-container hover:bg-surface-high"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeSection === "OBLIGATIONS" && (
            <Section title={profilConfirme ? "Obligations spécifiques verrouillées" : "Obligations spécifiques à configurer"}>
              {saveError && (
                <div className="mb-3 rounded-md bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
                  {saveError}
                </div>
              )}
              {profilConfirme && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-primary-fixed bg-primary-fixed/15 px-3 py-2 text-xs font-semibold text-on-surface-variant">
                  <Lock size={14} className="text-primary" />
                  Profil confirmé le {formatCreatedAt(beneficiaire.profilConfirmeLe)}
                </div>
              )}
              <div className="space-y-3">
                {orderedObligations.length > 0 ? (
                  orderedObligations.map((obligation) => (
                    <div key={obligation.id} className="flex flex-col sm:flex-row items-start gap-4 p-3 rounded-md bg-surface-low">
                      <div className="w-8 h-8 rounded-md bg-primary-fixed flex items-center justify-center text-[#2e4d44]">
                        <Shield size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-on-surface">
                          {obligation.categorie?.nom || obligation.type || "Obligation"}
                        </p>
                        <p className="text-xs text-on-secondary-container mt-1">
                          {obligation.description}
                        </p>
                        {obligation.frequence && (
                          <p className="text-[10px] uppercase tracking-wider text-on-secondary-container mt-2">
                            {obligation.frequence}
                            {obligation.heure ? ` • ${formatTimeOnly(obligation.heure)}` : ""}
                            {obligation.lieu ? ` • ${obligation.lieu}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                            profilConfirme || obligation.statutStructuration === "VALIDE"
                              ? "bg-primary-fixed text-[#2e4d44]"
                              : "bg-error-container text-on-error-container"
                          }`}
                        >
                          {profilConfirme || obligation.statutStructuration === "VALIDE" ? "Configuré" : "A configurer"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModify(obligation)}
                            disabled={profilConfirme || saving}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              profilConfirme
                                ? "bg-surface-high text-outline-variant cursor-not-allowed"
                                : "bg-white text-primary hover:bg-surface-high"
                            }`}
                          >
                            <Pencil size={12} />
                            {obligation.statutStructuration === "VALIDE" ? "Modifier" : "Configurer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-on-secondary-container bg-white border border-surface-low rounded-md p-3">
                    Aucune obligation structuree disponible
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-md border border-surface-low bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-on-surface">Confirmer le profil</p>
                  <p className="mt-1 text-xs text-on-secondary-container">
                    Une fois confirmé, le profil et ses obligations ne pourront plus être modifiés.
                  </p>
                </div>
                {profilConfirme ? (
                  <span className="inline-flex items-center gap-2 self-start rounded-full bg-primary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2e4d44]">
                    <Lock size={12} />
                    Profil confirmé
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmProfil}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Confirmer profil
                  </button>
                )}
              </div>
            </Section>
          )}

          {activeSection === "HISTORIQUE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Chronologie d’activité">
                {beneficiaire.pointages && beneficiaire.pointages.length > 0 ? (
                  <div className="space-y-4 text-xs text-on-secondary-container">
                    {beneficiaire.pointages.map((pointage) => (
                      <div key={pointage.id} className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-1 ${
                            pointage.statut === "VALIDE"
                              ? "bg-[#2e4d44]"
                              : pointage.statut === "REFUSE"
                                ? "bg-on-error-container"
                                : "bg-on-secondary-container"
                          }`}
                        />
                        <div>
                          <p className="text-on-surface font-semibold">
                            {pointage.statut === "VALIDE"
                              ? "Pointage confirmé"
                              : pointage.statut === "REFUSE"
                                ? "Pointage refusé"
                                : pointage.statut === "ABSENT"
                                  ? "Absence de pointage"
                                  : "Pointage"}
                          </p>
                          <p>{formatLastPointage(pointage.dateHeure)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-on-secondary-container bg-white border border-surface-low rounded-md p-3">
                    Aucun pointage recent
                  </div>
                )}
              </Section>

              <Section title="Alertes récentes">
                {beneficiaire.alertes && beneficiaire.alertes.length > 0 ? (
                  <div className="space-y-3">
                    {beneficiaire.alertes.map((alerte) => (
                      <div key={alerte.id} className="flex items-start gap-3 p-3 rounded-md bg-surface-low">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center ${
                            alerte.niveau === "CRITIQUE"
                              ? "bg-error-container text-on-error-container"
                              : "bg-surface-high text-on-secondary-container"
                          }`}
                        >
                          <AlertCircle size={14} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-on-surface">{alerte.type}</p>
                          <p className="text-xs text-on-secondary-container mt-1">{alerte.message}</p>
                          <p className="text-[10px] uppercase tracking-wider text-on-secondary-container mt-2">
                            {alerte.statut} • {formatLastPointage(alerte.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            alerte.niveau === "CRITIQUE" ? "text-on-error-container" : "text-on-secondary-container"
                          }`}
                        >
                          {alerte.niveau}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-on-secondary-container bg-white border border-surface-low rounded-md p-3">
                    Aucune alerte recente
                  </div>
                )}
              </Section>

              {/* œœ */}
            </div>
          )}

          {activeSection === "RAPPORTS" && (
            <Section title="Évaluations et rapports reçus">
              <div className="space-y-3">
                {beneficiaryRapports.map((rapport) => (
                  <button
                    key={rapport.id}
                    type="button"
                    onClick={() => {
                      setSelectedRapportId(rapport.id);
                      setRapportDrawerOpen(true);
                    }}
                    className="grid w-full grid-cols-[minmax(0,1.2fr)_140px_120px_44px] items-center gap-4 rounded-xl border border-surface-high bg-white px-5 py-4 text-left transition-all hover:border-primary/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">
                        {rapport.titre ?? `Rapport ${rapport.type.toLowerCase()}`}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Rapport rédigé
                      </p>
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {rapport.createdAt.slice(0, 10)}
                    </div>
                    <div>
                      <span className="inline-flex rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2e4d44]">
                        {rapport.statut}
                      </span>
                    </div>
                    <div className="flex justify-end text-primary">
                      <Eye size={14} />
                    </div>
                  </button>
                ))}
                {evaluationsError ? (
                  <div className="rounded-md border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                    {evaluationsError}
                  </div>
                ) : evaluationsLoading ? (
                  <div className="flex min-h-32 items-center justify-center rounded-md border border-surface-low bg-white text-on-surface-variant">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : evaluations.length > 0 ? (
                  evaluations.map((evaluation) => {
                    const selected = selectedEvaluation?.id === evaluation.id;
                    return (
                      <button
                        key={evaluation.id}
                        type="button"
                        onClick={() => {
                          setSelectedEvaluationId(evaluation.id);
                          setEvaluationDrawerOpen(true);
                        }}
                        className={`grid w-full grid-cols-[minmax(0,1.2fr)_140px_120px_44px] items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all ${
                          selected
                            ? "border-primary bg-primary-fixed/10"
                            : "border-surface-high bg-white hover:border-primary/30"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface">
                            {evaluation.affectation.libelleSuivi}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Par {evaluation.service.nom}
                          </p>
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          Période : <span className="font-bold">{evaluation.periodeMois}</span>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getConformiteTone(evaluation.conformite)}`}>
                            {getConformiteLabel(evaluation.conformite)}
                          </span>
                        </div>
                        <div className="flex justify-end text-primary">
                          <Eye size={14} />
                        </div>
                      </button>
                    );
                  })
                ) : beneficiaryRapports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-high bg-surface-low p-8 text-center text-xs text-on-secondary-container">
                    Aucun rapport reçu pour le moment.
                  </div>
                ) : null}
              </div>
            </Section>
          )}

          {activeSection === "DOCUMENTS" && (
            <Section title="Gestion documentaire">
              {documentNotice && (
                <div className="mb-3 flex items-start gap-2 rounded-md border border-[#86efac] bg-[#dcfce7] px-3 py-2 text-xs font-semibold text-[#166534]">
                  <Check size={14} className="mt-0.5 shrink-0" />
                  <span>{documentNotice}</span>
                </div>
              )}
              {documentError && (
                <div className="mb-3 rounded-md bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
                  {documentError}
                </div>
              )}
              <div className="space-y-3">
                <div className="rounded-md border border-surface-low bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                        <FolderOpen size={14} />
                        Tous les documents
                      </div>
                      <p className="mt-1 text-xs text-on-secondary-container">
                        Arrêtés, pièces jointes des évaluations et fichiers téléversés.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentError(null);
                        setDocumentDrawerOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44]"
                    >
                      <Upload size={14} />
                      Téléverser
                    </button>
                  </div>
                </div>

                {documentCards.length > 0 ? (
                  documentCards.map((document, index) => (
                    <div key={`${document.title}-${index}`} className="flex items-start gap-3 rounded-md bg-surface-low p-3">
                      <div className="w-9 h-9 rounded-md bg-primary-fixed flex items-center justify-center text-[#2e4d44]">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-on-surface">{document.title}</p>
                        <p className="text-xs text-on-secondary-container mt-1">{document.kind}</p>
                        {document.subtitle && (
                          <p className="text-[10px] uppercase tracking-wider text-on-secondary-container mt-2">
                            {document.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {document.href ? (
                          <a
                            href={document.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-surface-high transition-colors"
                          >
                            <ArrowUpRight size={12} />
                            Télécharger
                          </a>
                        ) : (
                          <span className="rounded-md bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-outline-variant">
                            Sans fichier
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-surface-low bg-white p-4 text-xs text-on-secondary-container">
                    Aucun document disponible pour le moment.
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>    

      <SideDrawer open={evaluationDrawerOpen && !!selectedEvaluation} onClose={() => setEvaluationDrawerOpen(false)} showCloseButton>
        {selectedEvaluation ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="pr-12">
              <span className={`mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${getConformiteTone(selectedEvaluation.conformite)}`}>
                {getConformiteLabel(selectedEvaluation.conformite)}
              </span>
              <h2 className="text-[28px] font-extrabold leading-tight text-[#17362e]">
                {selectedEvaluation.affectation.libelleSuivi}
              </h2>
              <p className="mt-2 text-sm text-[#414845]">
                Évaluation soumise par {selectedEvaluation.service.nom}.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-[#f2f4f3] p-4 text-sm text-[#191c1c]">
                <p><span className="font-semibold">Code suivi :</span> {selectedEvaluation.affectation.codeSuivi}</p>
                <p className="mt-2"><span className="font-semibold">Période :</span> {selectedEvaluation.periodeMois}</p>
                <p className="mt-2"><span className="font-semibold">Observations :</span> {selectedEvaluation.observations || "Aucune observation renseignée."}</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#17362e]">
                  Présences
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-high bg-white p-2">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {selectedEvaluation.occurrences.map((occ) => (
                      <div key={occ.id} className="flex items-center justify-between rounded-md bg-surface-low px-2 py-1.5 text-xs">
                        <span className="font-mono font-medium">{occ.dateSuivi}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${occ.present ? "bg-primary-fixed text-[#17362e]" : "bg-error-container text-on-error-container"}`}>
                          {occ.present ? "Présent" : "Absent"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SideDrawer>

      <SideDrawer open={rapportDrawerOpen && !!selectedRapport} onClose={() => setRapportDrawerOpen(false)} showCloseButton>
        {selectedRapport ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="pr-12">
              <span className="mb-3 inline-block rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#2e4d44]">
                Rapport
              </span>
              <h2 className="text-[28px] font-extrabold leading-tight text-[#17362e]">
                {selectedRapport.titre ?? `Rapport ${selectedRapport.type.toLowerCase()}`}
              </h2>
              <p className="mt-2 text-sm text-[#414845]">
                Statut : {selectedRapport.statut}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {selectedRapport.contenu?.sections?.map((section) => (
                <div key={section.titre} className="rounded-lg border border-surface-high bg-white p-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#17362e]">
                    {section.titre}
                  </h3>
                  {section.colonnes ? (
                    <div className="mt-3 overflow-hidden rounded-lg border border-surface-high">
                      <table className="w-full text-left text-xs">
                        <tbody>
                          {section.lignes.map((ligne, index) => (
                            <tr key={index} className="border-t border-surface-high first:border-t-0">
                              {(Array.isArray(ligne) ? ligne : typeof ligne === "object" && "cellules" in ligne ? ligne.cellules ?? [] : [String(ligne)]).map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#191c1c]">
                      {section.texte ?? section.lignes.map((ligne) => Array.isArray(ligne) ? ligne.join(" - ") : String(ligne)).join("\n")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SideDrawer>

      <SideDrawer open={documentDrawerOpen} onClose={() => setDocumentDrawerOpen(false)} showCloseButton>
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="pr-12">
              <span className="mb-3 inline-block rounded-full bg-primary-fixed px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#2e4d44]">
                Téléversement
              </span>
              <h2 className="text-[28px] font-extrabold leading-tight text-[#17362e]">
                Ajouter un document
              </h2>
              <p className="mt-2 text-sm text-[#414845]">
                Dépose ici les justificatifs, rapports, demandes ou tout document lié au bénéficiaire.
              </p>
            </div>

            {documentError && (
              <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                {documentError}
              </div>
            )}

            <form onSubmit={handleDocumentSubmit} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                Type de document <span className="text-on-error-container">*</span>
                <select
                  value={documentForm.typeDocument}
                  onChange={(event) => {
                    setDocumentError(null);
                    setDocumentForm((prev) => ({ ...prev, typeDocument: event.target.value }));
                  }}
                  aria-required="true"
                  className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="JUSTIFICATIF">Justificatif</option>
                  <option value="RAPPORT">Rapport</option>
                  <option value="DEMANDE">Demande</option>
                  <option value="ARRETE">Arrêté</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                Titre <span className="text-on-error-container">*</span>
                <input
                  type="text"
                  value={documentForm.titre}
                  onChange={(event) => {
                    setDocumentError(null);
                    setDocumentForm((prev) => ({ ...prev, titre: event.target.value }));
                  }}
                  aria-required="true"
                  className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex. Arrêté ministériel"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                Description
                <textarea
                  value={documentForm.description}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={4}
                  className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Décris le document ou le contexte"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                Fichier <span className="text-on-error-container">*</span>
                <input
                  key={documentInputKey}
                  type="file"
                  onChange={(event) => {
                    setDocumentError(null);
                    setDocumentForm((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] ?? null,
                    }));
                  }}
                  aria-required="true"
                  className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none"
                />
                <span className="mt-2 block text-[11px] normal-case tracking-normal text-on-secondary-container">
                  {documentForm.file ? documentForm.file.name : "Aucun fichier sélectionné"}
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDocumentDrawerOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-surface-high bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-low"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={documentUploading}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {documentUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Téléverser le document
                </button>
              </div>
            </form>
          </div>
        </div>
      </SideDrawer>

      {isModalOpen && selectedObligation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white shadow-2xl border border-surface-high overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface border-b border-surface-high flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                  <Pencil size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-on-secondary-container truncate">
                    Configuration d&apos;obligation
                  </p>
                  <p className="text-sm sm:text-base font-bold text-on-surface truncate">
                    {selectedObligation.categorie?.nom || selectedObligation.type || "Obligation"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center rounded-full bg-surface-high px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container whitespace-nowrap">
                  Configuration
                </span>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-9 h-9 rounded-md bg-white text-on-secondary-container border border-surface-high flex items-center justify-center hover:bg-surface-low transition-colors shrink-0"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 overflow-y-auto">
              <div className="rounded-md bg-surface border border-surface-low p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e4d44] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-[#2e4d44] inline-flex items-center justify-center">
                    <LayoutGrid size={12} />
                  </span>
                  Champs principaux
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Type
                  <input
                    type="text"
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Frequence
                  <select
                    value={form.frequence}
                    onChange={(event) => {
                      const frequence = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        frequence,
                        jourSemaine: frequence === "QUOTIDIEN" ? "" : prev.jourSemaine,
                      }));
                    }}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">—</option>
                    <option value="QUOTIDIEN">Quotidien</option>
                    <option value="HEBDOMADAIRE">Hebdomadaire</option>
                    <option value="MENSUEL">Mensuel</option>
                    <option value="PONCTUEL">Ponctuel</option>
                  </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Jour semaine
                  <select
                    value={form.jourSemaine}
                    onChange={(event) => setForm((prev) => ({ ...prev, jourSemaine: event.target.value }))}
                    disabled={form.frequence === "QUOTIDIEN"}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-high disabled:text-on-secondary-container disabled:opacity-60"
                  >
                    <option value="">—</option>
                    <option value="LUNDI">Lundi</option>
                    <option value="MARDI">Mardi</option>
                    <option value="MERCREDI">Mercredi</option>
                    <option value="JEUDI">Jeudi</option>
                    <option value="VENDREDI">Vendredi</option>
                    <option value="SAMEDI">Samedi</option>
                    <option value="DIMANCHE">Dimanche</option>
                  </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Heure
                  <input
                    type="time"
                    value={form.heure}
                    onChange={(event) => setForm((prev) => ({ ...prev, heure: event.target.value }))}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-1 text-[10px] text-on-secondary-container">Fuseau : UTC</p>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Lieu
                  <input
                    type="text"
                    value={form.lieu}
                    onChange={(event) => setForm((prev) => ({ ...prev, lieu: event.target.value }))}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Date debut
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={(event) => setForm((prev) => ({ ...prev, dateDebut: event.target.value }))}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                  Date fin
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={(event) => setForm((prev) => ({ ...prev, dateFin: event.target.value }))}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  </label>
                </div>
              </div>

              <div className="rounded-md bg-white border border-surface-low p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e4d44] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-[#2e4d44] inline-flex items-center justify-center">
                    <AlignLeft size={12} />
                  </span>
                  Description
                </p>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  aria-label="Description de l'obligation"
                  className="w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* <div className="rounded-md bg-surface border border-surface-low p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e4d44] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-[#2e4d44] inline-flex items-center justify-center">
                    <Shield size={12} />
                  </span>
                  Traçabilité
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                    Motif (optionnel)
                    <select
                      value={form.raisonModification}
                      onChange={(event) => setForm((prev) => ({ ...prev, raisonModification: event.target.value }))}
                      className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">—</option>
                      {MODIFICATION_REASONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6f0015]">
                    Autre raison
                    <input
                      type="text"
                      value={form.raisonAutre}
                      onChange={(event) => setForm((prev) => ({ ...prev, raisonAutre: event.target.value }))}
                      disabled={form.raisonModification !== "AUTRE"}
                      className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      placeholder="Preciser la raison"
                    />
                  </label>
                </div>
              </div> */}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-md bg-surface-low text-xs font-bold text-on-secondary-container hover:bg-surface-high transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-primary text-xs font-bold text-white hover:bg-[#2e4d44] transition-colors disabled:opacity-60"
                >
                  {saving ? "Validation..." : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
