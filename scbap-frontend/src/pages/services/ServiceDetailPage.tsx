import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "../../components/ui/index";
import { useToast } from "../../context/ToastContext";
import { useBeneficiaires } from "../../hooks/useBeneficiaires";
import { useServiceExterne } from "../../hooks/useServicesExternes";
import { api } from "../../lib/api";
import type {
  ApiResponse,
  Beneficiaire,
  ServiceExterneAffectation,
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
  libelleSuivi: string;
  frequenceAttendue: string;
  lieuAttendu: string;
  horairesAttendus: string;
  modalitesConnues: boolean;
};

const DEFAULT_FORM: AffectationFormState = {
  beneficiaireId: "",
  obligationId: "",
  typeSuivi: "",
  libelleSuivi: "",
  frequenceAttendue: "",
  lieuAttendu: "",
  horairesAttendus: "",
  modalitesConnues: false,
};

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
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null);

  const selectedBeneficiaire = useMemo(
    () => beneficiaires.find((beneficiaire) => beneficiaire.id === form.beneficiaireId) ?? null,
    [beneficiaires, form.beneficiaireId],
  );

  useEffect(() => {
    if (!selectedBeneficiaire) {
      return;
    }

    if (
      form.obligationId &&
      !selectedBeneficiaire.obligations?.some((obligation) => obligation.id === form.obligationId)
    ) {
      setForm((current) => ({ ...current, obligationId: "" }));
    }
  }, [form.obligationId, selectedBeneficiaire]);

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
          libelleSuivi: form.libelleSuivi.trim(),
          frequenceAttendue: form.frequenceAttendue.trim() || null,
          lieuAttendu: form.lieuAttendu.trim() || null,
          horairesAttendus: form.horairesAttendus.trim()
            ? { texte: form.horairesAttendus.trim() }
            : null,
          modalitesConnues: form.modalitesConnues,
        },
      );

      setForm(DEFAULT_FORM);
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
                <h2 className="text-lg font-bold text-on-surface">Bénéficiaires affectés</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Chaque ligne donne le code de suivi à transmettre au bénéficiaire pour son service partenaire.
                </p>
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
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">
                      Affecter un nouveau bénéficiaire
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Renseigne le suivi attendu pour générer immédiatement son code de suivi.
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
                    <Plus size={18} />
                  </div>
                </div>

                {beneficiairesError && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{beneficiairesError}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleCreateAffectation}>
                  <Select
                    label="Bénéficiaire"
                    value={form.beneficiaireId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        beneficiaireId: event.target.value,
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
                    options={(selectedBeneficiaire?.obligations || []).map((obligation) => ({
                      value: obligation.id,
                      label:
                        obligation.description ||
                        obligation.type ||
                        obligation.categorie?.nom ||
                        obligation.id,
                    }))}
                    disabled={!selectedBeneficiaire}
                  />

                  <Input
                    label="Type de suivi"
                    value={form.typeSuivi}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, typeSuivi: event.target.value }))
                    }
                    placeholder="Ex: Suivi médical mensuel"
                    required
                  />

                  <Input
                    label="Libellé du suivi"
                    value={form.libelleSuivi}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, libelleSuivi: event.target.value }))
                    }
                    placeholder="Ex: Contrôle mensuel avec compte-rendu"
                    required
                  />

                  <Input
                    label="Fréquence attendue"
                    value={form.frequenceAttendue}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        frequenceAttendue: event.target.value,
                      }))
                    }
                    placeholder="Ex: Chaque mois"
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

                  <label className="flex items-start gap-3 rounded-xl border border-surface-high bg-surface-low px-4 py-3">
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
                  </label>

                  <Button type="submit" className="w-full" loading={saving}>
                    Créer l’affectation
                  </Button>
                </form>
              </Card>

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
    </div>
  );
}
