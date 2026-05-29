import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "../../components/ui/index";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { useToast } from "../../context/ToastContext";
import { useBeneficiaires } from "../../hooks/useBeneficiaires";
import { useServiceExterne } from "../../hooks/useServicesExternes";
import { api } from "../../lib/api";
import type {
  ApiResponse,
  Beneficiaire,
  ServiceExterneAffectation,
  ServiceExterneType,
} from "../../types";
import { ALL_PAGE_SIZE } from "../../utils/pagination";
import {
  AFFECTATION_STATUS_LABELS,
  SERVICE_EXTERNE_TYPE_LABELS,
  formatHorairesAttendus,
} from "../../utils/services-externes";
import { formatInAppTimeZone } from "../../utils/timezone";

type AffectationFormState = {
  beneficiaireId: string;
  obligationId: string;
  typeSuivi: string;
  frequenceAttendue: string;
  lieuAttendu: string;
  horairesAttendus: string;
  modalitesConnues: boolean;
};

type ServiceFormState = {
  nom: string;
  type: ServiceExterneType;
  email: string;
  telephone: string;
};

const DEFAULT_FORM: AffectationFormState = {
  beneficiaireId: "",
  obligationId: "",
  typeSuivi: "",
  frequenceAttendue: "",
  lieuAttendu: "",
  horairesAttendus: "",
  modalitesConnues: false,
};

const DEFAULT_SERVICE_FORM: ServiceFormState = {
  nom: "",
  type: "MEDICAL",
  email: "",
  telephone: "",
};

const TYPE_SUIVI_OPTIONS = [
  { value: "Suivi médical", label: "Suivi médical" },
  { value: "Suivi social", label: "Suivi social" },
  { value: "Suivi emploi", label: "Suivi emploi" },
  { value: "Suivi formation", label: "Suivi formation" },
  { value: "Suivi psychologique", label: "Suivi psychologique" },
  { value: "Contrôle administratif", label: "Contrôle administratif" },
  { value: "Autre suivi", label: "Autre suivi" },
];

const FREQUENCE_SUIVI_OPTIONS = [
  { value: "Quotidien", label: "Quotidien" },
  { value: "Hebdomadaire", label: "Hebdomadaire" },
  { value: "Bimensuel", label: "Bimensuel" },
  { value: "Mensuel", label: "Mensuel" },
  { value: "Trimestriel", label: "Trimestriel" },
  { value: "Ponctuel", label: "Ponctuel" },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return formatInAppTimeZone(new Date(value), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBeneficiaireLabel(beneficiaire: Beneficiaire) {
  const dossier = beneficiaire.dossier;
  if (!dossier) {
    return "Bénéficiaire sans dossier";
  }

  return `${dossier.nom} ${dossier.prenom} • ${dossier.numeroDossier}`;
}

function getAffectationStatusClassName(statut: string) {
  if (statut === "ACTIVE") {
    return "bg-primary-fixed text-[#2e4d44]";
  }

  if (statut === "EN_ATTENTE") {
    return "bg-[#ffe9c7] text-[#6b3d00]";
  }

  return "bg-surface-high text-on-surface-variant";
}

function getObligationLabel(affectation: ServiceExterneAffectation) {
  if (!affectation.obligation) {
    return "Aucune obligation liée";
  }

  return (
    affectation.obligation.description ||
    affectation.obligation.type ||
    affectation.obligation.categorie?.nom ||
    "Obligation liée"
  );
}

function getBeneficiaireObligationLabel(obligation: NonNullable<Beneficiaire["obligations"]>[number]) {
  return (
    obligation.description ||
    obligation.libelle ||
    obligation.type ||
    obligation.categorie?.nom ||
    obligation.code ||
    obligation.id
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { service, loading, error, refetch } = useServiceExterne(id);
  const {
    beneficiaires,
    loading: beneficiairesLoading,
    error: beneficiairesError,
  } = useBeneficiaires(1, ALL_PAGE_SIZE);
  const [form, setForm] = useState<AffectationFormState>(DEFAULT_FORM);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(DEFAULT_SERVICE_FORM);
  const [saving, setSaving] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [resending, setResending] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null);
  const [affectationDrawerOpen, setAffectationDrawerOpen] = useState(false);
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [selectedBeneficiaireDetail, setSelectedBeneficiaireDetail] = useState<Beneficiaire | null>(null);
  const [selectedBeneficiaireLoading, setSelectedBeneficiaireLoading] = useState(false);

  const selectedBeneficiaire = useMemo(
    () => beneficiaires.find((beneficiaire) => beneficiaire.id === form.beneficiaireId) ?? null,
    [beneficiaires, form.beneficiaireId],
  );
  const selectedAffectationBeneficiaire = selectedBeneficiaireDetail ?? selectedBeneficiaire;
  const selectedObligations = selectedAffectationBeneficiaire?.obligations ?? [];
  const selectedObligation = selectedObligations.find((obligation) => obligation.id === form.obligationId) ?? null;

  useEffect(() => {
    if (!selectedAffectationBeneficiaire) {
      return;
    }

    if (
      form.obligationId &&
      !selectedObligations.some((obligation) => obligation.id === form.obligationId)
    ) {
      setForm((current) => ({ ...current, obligationId: "" }));
    }
  }, [form.obligationId, selectedAffectationBeneficiaire, selectedObligations]);

  useEffect(() => {
    if (!form.beneficiaireId) {
      setSelectedBeneficiaireDetail(null);
      return;
    }

    let active = true;
    setSelectedBeneficiaireLoading(true);

    api.get<ApiResponse<Beneficiaire>>(`/beneficiaires/${form.beneficiaireId}`)
      .then((res) => {
        if (active) {
          setSelectedBeneficiaireDetail(res.data);
        }
      })
      .catch((e) => {
        if (active) {
          setSelectedBeneficiaireDetail(null);
          showToast((e as Error).message, "error");
        }
      })
      .finally(() => {
        if (active) {
          setSelectedBeneficiaireLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form.beneficiaireId, showToast]);

  useEffect(() => {
    if (!newAccessCode) return;

    const timeout = window.setTimeout(() => {
      setNewAccessCode(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [newAccessCode]);

  function openServiceDrawer() {
    if (!service) return;
    setServiceForm({
      nom: service.nom,
      type: service.type as ServiceExterneType,
      email: service.email,
      telephone: service.telephone ?? "",
    });
    setServiceDrawerOpen(true);
  }

  async function handleCreateAffectation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service) {
      return;
    }

    setSaving(true);

    try {
      await api.post<ApiResponse<ServiceExterneAffectation>>(
        "/services-externes/affectations",
        {
          serviceId: service.id,
          beneficiaireId: form.beneficiaireId,
          obligationId: form.obligationId || null,
          typeSuivi: form.typeSuivi.trim(),
          libelleSuivi: selectedObligation
            ? getBeneficiaireObligationLabel(selectedObligation)
            : form.typeSuivi.trim(),
          frequenceAttendue: form.frequenceAttendue.trim() || null,
          lieuAttendu: form.lieuAttendu.trim() || null,
          horairesAttendus: form.horairesAttendus.trim()
            ? { texte: form.horairesAttendus.trim() }
            : null,
          modalitesConnues: form.modalitesConnues,
        },
      );

      setForm(DEFAULT_FORM);
      setAffectationDrawerOpen(false);
      showToast(
        "Affectation créée avec succès. Le code d'accès a été envoyé par email au service partenaire.",
        "success",
      );
      await refetch();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service) {
      return;
    }

    setSavingService(true);

    try {
      await api.put<ApiResponse<unknown>>(`/services-externes/${service.id}`, {
        nom: serviceForm.nom.trim(),
        type: serviceForm.type,
        email: serviceForm.email.trim().toLowerCase(),
        telephone: serviceForm.telephone.trim() || null,
        actif: service.actif,
      });
      setServiceDrawerOpen(false);
      showToast("Service mis à jour avec succès.", "success");
      await refetch();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSavingService(false);
    }
  }

  async function handleResendAccessCode() {
    if (!service || !window.confirm("Générer un nouveau code d'accès et le renvoyer par mail ?")) {
      return;
    }
    setResending(true);
    try {
      const res = await api.post<ApiResponse<{ codeAccesInitial: string }>>(`/services-externes/${service.id}/reset-access-code`, {});
      setNewAccessCode(res.data.codeAccesInitial);
      showToast("Un nouveau code d'accès a été généré et envoyé par mail.", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-full bg-surface p-4 sm:p-8">
      <div className="mb-6">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />
          Retour aux services
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center text-on-surface-variant">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : error || !service ? (
        <Card className="border border-error/20 bg-error/10">
          <div className="flex items-start gap-3 text-on-error-container">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Impossible de charger ce service.</p>
              <p className="mt-1 text-sm">{error || "Service externe introuvable."}</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border border-surface-high shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-on-error-container">{service.nom}</h1>
                  <span className="inline-flex rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2e4d44]">
                    {SERVICE_EXTERNE_TYPE_LABELS[service.type]}
                  </span>
                  <span className="inline-flex rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {service.actif ? "Actif" : "Inactif"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2">
                    <Mail size={15} />
                    {service.email}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Phone size={15} />
                    {service.telephone || "Téléphone non renseigné"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <ClipboardList size={15} />
                    {service.stats.affectationsActives} affectation(s) active(s)
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Send size={15} />
                    {service.stats.evaluationsTotal} évaluation(s) reçue(s)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="border border-surface-high bg-white"
                  onClick={openServiceDrawer}
                >
                  <Pencil size={14} />
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="border border-primary/20 text-primary"
                  onClick={handleResendAccessCode}
                  disabled={resending}
                >
                  {resending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Renvoyer le code d'accès
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-surface-high bg-white"
                  onClick={() => void refetch()}
                >
                  <RefreshCw size={14} />
                  Actualiser
                </Button>
              </div>
            </div>
          </Card>

          {newAccessCode && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary-fixed/30 p-4 text-sm text-[#17362e]">
              <p className="font-bold">Nouveau code d'accès généré:</p>
              {/* <p className="mt-1 font-mono text-xl tracking-widest">{newAccessCode}</p> */}
              <p className="mt-2 text-xs opacity-70">
                Le partenaire a reçu ce code par email. Ce code remplace l'ancien.
              </p>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <Card className="border border-surface-high p-0 shadow-sm">
              <div className="border-b border-surface-high px-5 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Bénéficiaires affectés</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Chaque ligne donne le code de suivi à transmettre au bénéficiaire pour son service partenaire.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAffectationDrawerOpen(true)}
                  >
                    <Plus size={14} />
                    Affecter un bénéficiaire
                  </Button>
                </div>
              </div>

              {service.affectations.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <ClipboardList size={24} className="mx-auto text-outline-variant" />
                  <p className="mt-4 text-sm font-semibold text-on-surface">
                    Aucune affectation n’a encore été créée pour ce service.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 px-5 py-5">
                  {service.affectations.map((affectation) => (
                    <div
                      key={affectation.id}
                      className="rounded-2xl border border-surface-high bg-white p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/beneficiaires/${affectation.beneficiaire.id}`}
                              className="text-base font-bold text-on-surface transition-colors hover:text-primary"
                            >
                              {affectation.beneficiaire.dossier
                                ? `${affectation.beneficiaire.dossier.nom} ${affectation.beneficiaire.dossier.prenom}`
                                : "Bénéficiaire"}
                            </Link>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getAffectationStatusClassName(
                                affectation.statut,
                              )}`}
                            >
                              {AFFECTATION_STATUS_LABELS[affectation.statut] || affectation.statut}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-col gap-2 text-sm text-on-error-container">
                            <p className="inline-flex items-center gap-2">
                              <UserRound size={14} />
                              {affectation.beneficiaire.dossier?.numeroDossier || "Dossier indisponible"}
                            </p>
                            <p className="inline-flex items-center gap-2">
                              <ClipboardList size={14} />
                              {affectation.libelleSuivi}
                            </p>
                            <p className="inline-flex items-center gap-2">
                              <MapPin size={14} />
                              {affectation.lieuAttendu || getObligationLabel(affectation)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg bg-primary-fixed/60 px-3  text-center lg:min-w-40">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#33584b]">
                            Code de suivi
                          </p>
                          <p className="mt-1 font-mono font-bold tracking-[0.18em] text-[#17362e]">
                            {affectation.codeSuivi}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-2xl bg-surface-low px-4 py-3 text-sm text-on-surface-variant sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Type de suivi
                          </p>
                          <p className="mt-1 font-medium text-on-surface">
                            {affectation.typeSuivi}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Fréquence
                          </p>
                          <p className="mt-1 font-medium text-on-surface">
                            {affectation.frequenceAttendue || affectation.obligation?.frequence || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Horaires
                          </p>
                          <p className="mt-1 font-medium text-on-surface">
                            {formatHorairesAttendus(affectation.horairesAttendus)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Créée le
                          </p>
                          <p className="mt-1 font-medium text-on-surface">
                            {formatDateTime(affectation.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="border border-surface-high shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17362e] text-white">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">
                      Rappel du flux partenaire
                    </h3>
                    <div className="mt-3 space-y-3 text-sm text-on-surface-variant">
                      <p>1. Créer l’affectation pour générer le code de suivi.</p>
                      <p>2. Remettre ce code au bénéficiaire pour transmission au service.</p>
                      <p>3. Le service utilise son code reçu par email pour accéder au portail.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
      <SideDrawer
        open={serviceDrawerOpen && !!service}
        onClose={() => setServiceDrawerOpen(false)}
        showCloseButton
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="pr-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <Building2 size={18} />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-[#17362e]">Modifier le service</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Les informations actuelles sont pré-remplies depuis la fiche du service.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleUpdateService}>
            <Input
              label="Nom du service"
              value={serviceForm.nom}
              onChange={(event) =>
                setServiceForm((current) => ({ ...current, nom: event.target.value }))
              }
              required
            />
            <Select
              label="Type de service"
              value={serviceForm.type}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  type: event.target.value as ServiceExterneType,
                }))
              }
              options={Object.entries(SERVICE_EXTERNE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Adresse email"
              type="email"
              value={serviceForm.email}
              onChange={(event) =>
                setServiceForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <Input
              label="Téléphone"
              value={serviceForm.telephone}
              onChange={(event) =>
                setServiceForm((current) => ({ ...current, telephone: event.target.value }))
              }
              placeholder="Optionnel"
            />
            <Button type="submit" className="w-full" loading={savingService}>
              Enregistrer les modifications
            </Button>
          </form>
        </div>
      </SideDrawer>

      <SideDrawer
        open={affectationDrawerOpen}
        onClose={() => setAffectationDrawerOpen(false)}
        showCloseButton
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="pr-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <Plus size={18} />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-[#17362e]">
              Affecter un bénéficiaire
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Renseigne le suivi attendu pour générer immédiatement son code de suivi.
            </p>
          </div>

          {beneficiairesError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{beneficiairesError}</span>
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleCreateAffectation}>
            <Select
              label="Bénéficiaire"
              value={form.beneficiaireId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  beneficiaireId: event.target.value,
                  obligationId: "",
                }))
              }
              options={beneficiaires.map((beneficiaire) => ({
                value: beneficiaire.id,
                label: getBeneficiaireLabel(beneficiaire),
              }))}
              disabled={beneficiairesLoading}
              required
            />

            <Select
              label="Obligation liée"
              value={form.obligationId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  obligationId: event.target.value,
                }))
              }
              options={selectedObligations.map((obligation) => ({
                value: obligation.id,
                label: getBeneficiaireObligationLabel(obligation),
              }))}
              disabled={!selectedAffectationBeneficiaire || selectedBeneficiaireLoading}
            />
            {form.beneficiaireId && selectedBeneficiaireLoading ? (
              <p className="text-xs font-medium text-on-surface-variant">
                Chargement des obligations du bénéficiaire...
              </p>
            ) : form.beneficiaireId && selectedObligations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-surface-high bg-surface-low px-3 py-2 text-xs text-on-surface-variant">
                Aucune obligation liée disponible pour ce bénéficiaire.
              </p>
            ) : null}

            <Select
              label="Type de suivi"
              value={form.typeSuivi}
              onChange={(event) =>
                setForm((current) => ({ ...current, typeSuivi: event.target.value }))
              }
              options={TYPE_SUIVI_OPTIONS}
              required
            />

            <Select
              label="Fréquence attendue"
              value={form.frequenceAttendue}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  frequenceAttendue: event.target.value,
                }))
              }
              options={FREQUENCE_SUIVI_OPTIONS}
            />

            <Input
              label="Lieu attendu"
              value={form.lieuAttendu}
              onChange={(event) =>
                setForm((current) => ({ ...current, lieuAttendu: event.target.value }))
              }
              placeholder="Ex: Agence de placement Akpakpa"
            />

            <Textarea
              label="Horaires / modalités"
              value={form.horairesAttendus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  horairesAttendus: event.target.value,
                }))
              }
              placeholder="Ex: Tous les lundis à 08h ou selon planning communiqué par le partenaire"
              rows={4}
            />

            {/* <label className="flex items-start gap-3 rounded-xl border border-surface-high bg-surface-low px-4 py-3">
              <input
                type="checkbox"
                checked={form.modalitesConnues}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    modalitesConnues: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-surface-high text-primary"
              />
              <span className="text-sm text-on-surface-variant">
                Les modalités de suivi sont déjà connues au moment de l’affectation.
              </span>
            </label> */}

            <Button type="submit" className="w-full" loading={saving}>
              Créer l’affectation
            </Button>
          </form>
        </div>
      </SideDrawer>
    </div>
  );
}
