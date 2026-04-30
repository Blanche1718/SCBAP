import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Loader2,
  Clock,
  Shield,
  Activity,
  // AlertTriangle,
  // CheckCircle2,
} from "lucide-react";
import { useDossier } from "../../hooks/useDossiers";
import { formatInAppTimeZone } from "../../utils/timezone";
function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return formatInAppTimeZone(new Date(dateStr), {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-surface-low bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-error-container">
          {label}
        </span>
      </div>
      <div className="rounded-md bg-surface-low px-3 py-2">
        <p className={`text-sm text-on-surface ${mono ? "font-mono" : "font-semibold"}`}>
          {value || <span className="text-outline-variant">—</span>}
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-4 sm:p-6 border border-surface-low">
      <h2 className="text-xs font-bold text-on-error-container uppercase tracking-widest mb-5 pb-3 border-b border-surface-low flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
          <Icon size={13} />
        </span>
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">{children}</div>
    </div>
  );
}

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dossier, loading, error } = useDossier(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-on-surface-variant">
        <Loader2 size={18} className="animate-spin text-primary" />
        <span className="text-sm">Chargement…</span>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-error-container text-on-error-container">
          <AlertCircle size={15} />
          <p className="text-sm font-medium">{error || "Dossier introuvable"}</p>
        </div>
      </div>
    );
  }

  // const statut = dossier.statut as StatutDossier;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/dossiers"
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft size={15} />
          Dossiers
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-sm font-mono text-on-surface-variant">{dossier.numeroDossier}</span>
      </div>

      {/* Hero card */}
      <div
        className="rounded-lg p-5 sm:p-6 mb-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, #17362e 0%, #2e4d44 60%, #93000a 160%)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-white/15 flex items-center justify-center text-xl font-bold shrink-0">
              {dossier.nom[0]}{dossier.prenom[0]}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">
                {dossier.nom} {dossier.prenom}
              </h1>
              <p className="text-white/60 font-mono text-sm mt-1">
                {dossier.numeroDossier}
              </p>
            </div>
          </div>
          {/* <div className="flex items-center gap-3">
            {statut === "REVOQUE" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-error-container px-3 py-1 text-[11px] font-bold text-on-error-container uppercase tracking-wider">
                <AlertTriangle size={12} />
                Alerte critique
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold text-[#2e4d44] uppercase tracking-wider">
                <CheckCircle2 size={12} />
                Suivi stable
              </span>
            )}
            <Badge variant={STATUT_VARIANT[statut]}>{STATUT_LABEL[statut]}</Badge>
          </div> */}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6 pt-4 border-t border-white/15">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar size={11} /> Fin de peine
            </p>
            <p className="text-white font-semibold text-sm">
              {formatDate(dossier.dateFinPeine)}
            </p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock size={11} /> Durée peine
            </p>
            <p className="text-white font-semibold text-sm">
              {dossier.dureePeineMois} mois
            </p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity size={11} /> Numéro de mandat
            </p>
            <p className="text-white font-semibold text-sm">
              {dossier.numeroMandatDepot }
            </p>
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg bg-white p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-fixed text-[#2e4d44] flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">Conformité</p>
            <p className="text-sm font-bold text-on-surface">
              {statut === "REVOQUE" ? "Non conforme" : statut === "TERMINE" ? "Terminé" : "Actif"}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">Risque</p>
            <p className="text-sm font-bold text-on-surface">
              {statut === "REVOQUE" ? "Élevé" : statut === "TERMINE" ? "Faible" : "Moyen"}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-surface-high text-on-secondary-container flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">Dernier pointage</p>
            <p className="text-sm font-bold text-on-surface">—</p>
          </div>const STATUT_LABEL: Record<StatutDossier, string> = {
//   ACTIF: "Actif",
//   REVOQUE: "Révoqué",
//   TERMINE: "Terminé",
// };

// const STATUT_VARIANT: Record<StatutDossier, "compliant" | "alert" | "inactive" > = {
//   ACTIF: "compliant",
//   REVOQUE: "alert",
//   TERMINE: "inactive",
// };

        </div>
      </div> */}

      <div className="space-y-4">
        {/* Identité */}
        <Section title="Identité" icon={User}>
          <Field label="Nom" value={dossier.nom} />
          <Field label="Prénom" value={dossier.prenom} />
          <Field label="Sexe" value={dossier.sexe === "M" ? "Masculin" : dossier.sexe === "F" ? "Féminin" : undefined} />
          <Field label="Date de naissance" value={formatDate(dossier.dateNaissance)} />
          <Field label="Lieu de naissance" value={dossier.lieuNaissance} />
          <Field label="Nationalité" value={dossier.nationalite} />
          <Field label="Profession" value={dossier.profession} />
          <Field label="Téléphone" value={dossier.telephoneContact} />
          <div className="col-span-full">
            <Field label="Adresse" value={dossier.adresse} />
          </div>
        </Section>

        {/* Judiciaire */}
        <Section title="Informations judiciaires" icon={Shield}>
          <Field label="Juridiction" value={dossier.juridiction?.nom ?? dossier.juridictionId} />
          <Field label="Maison d'arrêt" value={dossier.prisonName} />
          <Field label="N° Mandat de dépôt" value={dossier.numeroMandatDepot} mono />
          <Field label="Date du mandat" value={formatDate(dossier.dateMandatDepot)} />
          <Field label="Date fin de peine" value={formatDate(dossier.dateFinPeine)} />
          <Field label="Durée (mois)" value={String(dossier.dureePeineMois)} />
          <div className="col-span-full">
            <Field label="Infractions" value={dossier.infractions} />
          </div>
          <div className="col-span-full">
            <Field label="Condamnation" value={dossier.condamnation} />
          </div>
        </Section>

        {/* Obligations */}
        {dossier.obligations && (
          <div className="rounded-lg bg-white p-4 sm:p-6">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 pb-3 border-b border-surface-low flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
                <FileText size={13} />
              </span>
              Obligations (texte brut DAPG)
            </h2>
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap bg-surface-low p-4 rounded-md">
              {dossier.obligations}
            </p>
             <div className="mt-3 flex items-center gap-2 text-xs text-on-secondary-container">
              <span className="inline-block w-2 h-2 rounded-full bg-on-error-container" />
              Structuration des obligations en attente de validation par l'agent
            </div>
          </div>
        )}

        {/* Observations */}
        {dossier.observations && (
          <div className="rounded-lg bg-white p-4 sm:p-6">
            <h2 className="text-xs font-bold text-on-error-container uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
                <MapPin size={13} />
              </span>
              Observations
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">{dossier.observations}</p>
          </div>
        )}
      </div>
    </div>
  );
}
