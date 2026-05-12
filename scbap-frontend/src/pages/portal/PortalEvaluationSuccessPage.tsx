import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Loader2, LogOut, Shield, UserRound } from "lucide-react";
import { clearPortalToken, getPortalToken } from "../../lib/portalAuth";
import type { PortalEvaluation } from "../../types";

type PortalEvaluationSuccessState = {
  evaluation?: PortalEvaluation;
  periodLabel?: string;
  beneficiaryName?: string;
  serviceName?: string;
};

export default function PortalEvaluationSuccessPage() {
  const navigate = useNavigate();
  const token = getPortalToken();
  const location = useLocation();
  const state = (location.state as PortalEvaluationSuccessState | null) ?? null;

  if (!token) {
    return <Navigate to="/portail" replace />;
  }

  const evaluation = state?.evaluation;
  const periodLabel = state?.periodLabel || evaluation?.periodeMois || "la période en cours";
  const beneficiaryName = state?.beneficiaryName || "Bénéficiaire";
  const serviceName = state?.serviceName || "Service partenaire";

  return (
    <div className="min-h-screen bg-[#f4f7f5] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
        <div className="w-full rounded-[32px] bg-white p-8 shadow-[0_18px_45px_rgba(23,54,46,0.08)] sm:p-10">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[24px] bg-primary-fixed text-[#2e4d44]">
            <CheckCircle2 size={34} />
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Formulaire transmis
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-on-surface">
              Merci, votre évaluation a bien été envoyée
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Votre évaluation pour {periodLabel} a été enregistrée dans SCBAP. Vous pouvez fermer la session ou revenir au portail pour préparer un autre suivi.
            </p>
          </div>

          <div className="mt-8 grid gap-3 rounded-[24px] bg-surface-low p-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-primary">
                <UserRound size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Bénéficiaire</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">{beneficiaryName}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {evaluation?.beneficiaire?.dossier?.numeroDossier || "Dossier indisponible"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-primary">
                <ClipboardList size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Suivi</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">{evaluation?.affectation?.libelleSuivi || "Suivi"}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{serviceName}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-primary">
                <Shield size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Conformité</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">
                {evaluation?.conformite || "SATISFAISANT"}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {evaluation?.frequenceSuivi || "Fréquence non précisée"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-primary">
                <Loader2 size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">État</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">Soumission confirmée</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {evaluation?.createdAt ? new Date(evaluation.createdAt).toLocaleString("fr-FR") : "Enregistrée à l’instant"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                clearPortalToken();
                navigate("/portail", { replace: true });
              }}
              className="inline-flex items-center justify-center rounded-full bg-[#17362e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#20483d]"
            >
              <LogOut size={15} className="mr-2" />
              Fermer ma session
            </button>
            <button
              type="button"
              onClick={() => navigate("/portail/evaluation", { replace: true })}
              className="inline-flex items-center justify-center rounded-full border border-surface-high bg-white px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low"
            >
              Retourner au formulaire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
