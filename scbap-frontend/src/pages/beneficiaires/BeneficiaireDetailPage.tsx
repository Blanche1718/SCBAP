import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Check,
  X,
  LayoutGrid,
  AlignLeft,
  Shield,
  MapPin,
  Activity,
  Loader2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { useBeneficiaire } from "../../hooks/useBeneficiaires";
import { api } from "../../lib/api";
import type { Obligation } from "../../types";

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

const MODIFICATION_REASONS = [
  { value: "NON_CONFORME", label: "Non conforme" },
  { value: "ORDONNE_PAR_DAPG", label: "Modification ordonnée par la DAPG" },
  { value: "AUTRE", label: "Autres" },
] as const;

function formatLastPointage(dateHeure?: string | null) {
  if (!dateHeure) return "—";
  const parsed = new Date(dateHeure);
  if (Number.isNaN(parsed.getTime())) return "—";
  const formatted = parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Porto-Novo",
  });
  return `${formatted} WAT`;
}

function formatTimeOnly(value?: string | null) {
  if (!value) return null;
  const parts = value.split("T");
  if (parts.length < 2) return value;
  return `${parts[1].slice(0, 5)} WAT`;
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

export default function BeneficiaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { beneficiaire, loading, error, refetch } = useBeneficiaire(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const fullName = dossier ? `${dossier.nom} ${dossier.prenom}` : "—";
  const riskLevel = dossier?.statut === "REVOQUE" ? "Elevé" : dossier?.statut === "TERMINE" ? "Faible" : "Moyen";
  const compliance = dossier?.statut === "REVOQUE" ? "Non conforme" : dossier?.statut === "TERMINE" ? "Terminé" : "Actif";
  const lastPointage = beneficiaire.pointages?.[0]?.dateHeure ?? null;
  const orderedObligations = [...(beneficiaire.obligations ?? [])].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.id || "").localeCompare(b.id || "");
  });

  function handleOpenModify(obligation: Obligation) {
    setSelectedObligation(obligation);
    setForm({
      type: obligation.type ?? "",
      frequence: obligation.frequence ?? "",
      jourSemaine: obligation.jourSemaine ?? "",
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

  async function handleConfirm(obligationId: string) {
    try {
      setActioningId(obligationId);
      setSaveError(null);
      await api.patch(`/obligations/${obligationId}/validate`, {});
      await refetch();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setActioningId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedObligation) return;

    const payload = {
      type: form.type || undefined,
      frequence: form.frequence || undefined,
      jour_semaine: form.jourSemaine || undefined,
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
    <div className="p-8 min-h-full bg-surface">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/beneficiaires"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={14} />
            Beneficiaires
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="text-sm font-semibold text-on-surface">{fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            <Bell size={16} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-on-error-container bg-error-container hover:bg-error-container/80 transition-colors uppercase tracking-wider"
          >
            <AlertTriangle size={14} />
            Alerte d&apos;urgence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
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
              <h1 className="text-lg font-bold text-on-surface mt-3">{fullName}</h1>
              <p className="text-xs text-on-secondary-container font-mono mt-1">
                {dossier?.numeroDossier ?? "—"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-on-secondary-container">
                <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Statut du beneficiaire</p>
                  <p className="text-sm font-semibold text-on-surface">{compliance}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Risque</p>
                  <p className="text-sm font-semibold text-on-surface">{riskLevel}</p>
                </div>
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
          </div>

          <Section title="Boucle GPS récente">
            <div className="rounded-md h-36 flex items-center justify-center relative overflow-hidden bg-[linear-gradient(135deg,#0f2620_0%,#17362e_100%)]">
              <MapPin size={18} className="text-primary-fixed z-10" />
              <div
                className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_12px,#c7eade_12px,#c7eade_13px),repeating-linear-gradient(90deg,transparent,transparent_12px,#c7eade_12px,#c7eade_13px)]"
              />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <span className="text-[10px] font-bold text-primary-fixed/70 tracking-widest uppercase">
                  Suivi actif
                </span>
              </div>
            </div>
            <p className="text-xs text-on-secondary-container mt-3">
              Dernière position connue : Zone 4
            </p>
          </Section>

          {dossier?.obligations && (
            <Section title="Obligations (texte brut DAPG)">
              <div className="rounded-md border border-surface-low bg-white p-3">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-error-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-error-container">
                  Exigences légales
                </div>
                <p className="whitespace-pre-wrap text-xs text-on-secondary-container leading-relaxed">
                  {dossier.obligations}
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
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          <div className="rounded-lg bg-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-on-secondary-container">
              <div>
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Conformité</p>
                <p className="text-sm font-semibold text-on-surface">{compliance}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Risque actuel</p>
                <p className="text-sm font-semibold text-on-surface">{riskLevel}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Dernier pointage</p>
                <p className="text-sm font-semibold text-on-surface">
                  {formatLastPointage(lastPointage)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-md bg-surface-low text-xs font-bold text-[#2e4d44] hover:bg-surface-high transition-colors">
                Mettre à jour le risque
              </button>
              <button className="px-3 py-2 rounded-md bg-primary text-xs font-bold text-white hover:bg-[#2e4d44] transition-colors">
                Ajouter un rapport
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button className="py-2 rounded-md bg-primary-fixed text-xs font-bold text-[#2e4d44]">
              Obligations
            </button>
            <button className="py-2 rounded-md bg-surface-low text-xs font-bold text-on-secondary-container">
              Historique de conformité
            </button>
            <button className="py-2 rounded-md bg-surface-low text-xs font-bold text-on-secondary-container">
              Documents & rapports
            </button>
          </div>

          <Section title="Exigences légales actives">
            {saveError && (
              <div className="mb-3 rounded-md bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
                {saveError}
              </div>
            )}
            <div className="space-y-3">
              {orderedObligations.length > 0 ? (
                orderedObligations.map((obligation) => (
                  <div key={obligation.id} className="flex items-start gap-3 p-3 rounded-md bg-surface-low">
                    <div className="w-8 h-8 rounded-md bg-primary-fixed flex items-center justify-center text-[#2e4d44]">
                      <Shield size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-on-surface">
                        {obligation.type || "Obligation"}
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
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                          obligation.statutStructuration === "VALIDE"
                            ? "bg-primary-fixed text-[#2e4d44]"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {obligation.statutStructuration === "VALIDE" ? "Validé" : "A valider"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirm(obligation.id)}
                          disabled={obligation.statutStructuration === "VALIDE" || actioningId === obligation.id || saving}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            obligation.statutStructuration === "VALIDE"
                              ? "bg-primary-fixed text-[#2e4d44] cursor-not-allowed"
                              : "bg-[#ffb86b] text-[#2b1600] hover:bg-[#ffa94d]"
                          }`}
                        >
                          <Check size={12} />
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModify(obligation)}
                          disabled={actioningId === obligation.id || saving}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-surface-high transition-colors"
                        >
                          <Pencil size={12} />
                          Modifier
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
          </Section>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <Section title="Pulse de conformité">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-on-secondary-container">Stabilité bracelet</p>
                <div className="mt-2 h-2 rounded-full bg-surface-high">
                  <div className="h-2 rounded-full bg-primary w-[88%]" />
                </div>
              </div>
              <div>
                <p className="text-xs text-on-secondary-container">Assiduité pointage</p>
                <div className="mt-2 h-2 rounded-full bg-surface-high">
                  <div className="h-2 rounded-full bg-primary w-[96%]" />
                </div>
              </div>
              <div>
                <p className="text-xs text-on-secondary-container">Niveau de risque</p>
                <div className="mt-2 h-2 rounded-full bg-surface-high">
                  <div className="h-2 rounded-full bg-on-error-container w-[34%]" />
                </div>
              </div>
              <div className="rounded-md bg-surface-low p-3 text-xs text-on-secondary-container">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Activity size={14} />
                  Recommandation automatique
                </div>
                <p className="mt-2">
                  Profil eligible a un assouplissement du suivi nocturne.
                </p>
              </div>
              <button className="w-full mt-2 rounded-md bg-primary text-white text-xs font-bold py-2 hover:bg-primary/90 transition-colors">
                Générer un dossier officiel
              </button>
            </div>
          </Section>
        </div>
      </div>    

      {isModalOpen && selectedObligation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-surface-high overflow-hidden">
            <div className="px-6 py-4 bg-surface border-b border-surface-high flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-secondary-container">
                    Modification d&apos;obligation
                  </p>
                  <p className="text-base font-bold text-on-surface">
                    {selectedObligation.type || "Obligation"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-surface-high px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
                Edition
              </span>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-9 h-9 rounded-md bg-white text-on-secondary-container border border-surface-high flex items-center justify-center hover:bg-surface-low transition-colors"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div className="rounded-md bg-surface border border-surface-low p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e4d44] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-[#2e4d44] inline-flex items-center justify-center">
                    <LayoutGrid size={12} />
                  </span>
                  Champs principaux
                </p>
                <div className="grid grid-cols-2 gap-4">
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
                    onChange={(event) => setForm((prev) => ({ ...prev, frequence: event.target.value }))}
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
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
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
                  <p className="mt-1 text-[10px] text-on-secondary-container">Fuseau : WAT</p>
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

              <div className="rounded-md bg-surface border border-surface-low p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e4d44] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-[#2e4d44] inline-flex items-center justify-center">
                    <Shield size={12} />
                  </span>
                  Traçabilité
                </p>
                <div className="grid grid-cols-2 gap-4">
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
              </div>

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
