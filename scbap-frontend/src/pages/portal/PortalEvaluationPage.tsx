import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  MapPin,
  Paperclip,
  Search,
  Plus,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { portalApi } from "../../lib/portalApi";
import { clearPortalToken, getPortalToken } from "../../lib/portalAuth";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { API_BASE_URL } from "../../lib/api";
import type {
  ApiResponse,
  PortalEvaluation,
  PortalSession,
} from "../../types";
import { SERVICE_EXTERNE_TYPE_LABELS } from "../../utils/services-externes";

type TrackingType = "QUOTIDIEN" | "HEBDOMADAIRE" | "MENSUEL";

type OccurrenceState = {
  date: string;
  present: boolean;
  observation?: string;
};

type EvaluationFormState = {
  typeSuivi: TrackingType;
  conformite: "SATISFAISANT" | "A_SURVEILLER" | "PREOCCUPANT";
  observations: string;
  occurrences: OccurrenceState[];
  files: File[];
};

function formatPeriodLabel(dateOnly: string) {
  const value = new Date(`${dateOnly}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Porto-Novo",
  }).format(value);
}

function getTodayDateOnly() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Porto-Novo",
  }).format(new Date());
}

function getPeriodStart(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function getPeriodDates(dateOnly: string) {
  const value = getPeriodStart(dateOnly);
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return { year, month, lastDay };
}

function buildDefaultOccurrences(typeSuivi: TrackingType, periode: string): OccurrenceState[] {
  const { year, month, lastDay } = getPeriodDates(periode);

  if (typeSuivi === "QUOTIDIEN") {
    return Array.from({ length: lastDay }, (_, index) => ({
      date: new Date(Date.UTC(year, month, index + 1)).toISOString().slice(0, 10),
      present: true,
    }));
  }

  if (typeSuivi === "HEBDOMADAIRE") {
    const slots = [1, 8, 15, 22];
    return slots.map((day) => ({
      date: new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10),
      present: true,
    }));
  }

  return [
    {
      date: getTodayDateOnly(),
      present: true,
    },
  ];
}

function getTrackingDescription(typeSuivi: TrackingType) {
  switch (typeSuivi) {
    case "QUOTIDIEN":
      return "Toutes les dates du mois sont générées automatiquement.";
    case "HEBDOMADAIRE":
      return "Quatre repères sont proposés par défaut, ajustables si besoin.";
    case "MENSUEL":
    default:
      return "Une date de constat principale est proposée par défaut.";
  }
}

export default function PortalEvaluationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = getPortalToken();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [occurrenceSearch, setOccurrenceSearch] = useState("");
  
  // États pour l'historique
  const [history, setSessionHistory] = useState<PortalEvaluation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [form, setForm] = useState<EvaluationFormState>({
    typeSuivi: "MENSUEL",
    conformite: "SATISFAISANT",
    observations: "",
    occurrences: buildDefaultOccurrences("MENSUEL", getTodayDateOnly()),
    files: [],
  });

  const selectedHistoryItem = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId]
  );

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await portalApi.get<ApiResponse<PortalSession>>("/portail/me");
        if (!active) return;

        setSession(res.data);
        setForm((current) => ({
          ...current,
          typeSuivi: (res.data.frequenceAttendue || "MENSUEL") as TrackingType,
          occurrences: buildDefaultOccurrences(
            (res.data.frequenceAttendue || "MENSUEL") as TrackingType,
            res.data.periodeCourante,
          ),
        }));
        setHistoryLoaded(false);
      } catch (e) {
        if (active) {
          const message = (e as Error).message;
          setError(message);
          showToast(message, "error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (token) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!session || historyLoaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setHistoryLoading(true);
        const histRes = await portalApi.get<ApiResponse<PortalEvaluation[]>>("/portail/evaluations");
        if (cancelled) return;
        setSessionHistory(histRes.data);
        setSelectedHistoryId((current) => current ?? histRes.data[0]?.id ?? null);
        setHistoryLoaded(true);
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, historyLoaded]);

  const filteredOccurrences = useMemo(() => {
    let query = occurrenceSearch.trim();

    if (form.typeSuivi === "QUOTIDIEN") {
      // Pour le suivi quotidien, on n'affiche rien par défaut si la recherche est vide
      if (!query) return [];

      // Support du format JJ/MM/AAAA pour la recherche (conversion vers AAAA-MM-JJ)
      const dateParts = query.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (dateParts) {
        query = `${dateParts[3]}-${dateParts[2].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
      }

      return form.occurrences.filter((occ) => occ.date.includes(query));
    }

    if (!query) {
      return form.occurrences;
    }
    return form.occurrences.filter(occ => occ.date.includes(query));
  }, [form.occurrences, occurrenceSearch, form.typeSuivi]);

  const periodLabel = useMemo(() => {
    if (!session?.periodeCourante) {
      return "";
    }

    return formatPeriodLabel(session.periodeCourante);
  }, [session?.periodeCourante]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const emptyFiles = form.files.filter((file) => file.size === 0);
    if (emptyFiles.length > 0) {
      showToast("Un ou plusieurs fichiers sont vides. Vérifiez les pièces jointes puis recommencez.", "error");
      return;
    }

    setSaving(true);

    let createdEvaluationId: string | null = null;

    try {
      // 1. Création de l'évaluation
      const evalRes = await portalApi.post<ApiResponse<PortalEvaluation>>("/portail/evaluations", {
        periodeMois: session.periodeCourante,
        frequenceSuivi: form.typeSuivi,
        conformite: form.conformite,
        observations: form.observations.trim() || null,
        occurrences: form.occurrences,
      });

      createdEvaluationId = evalRes.data.id;

      // 2. Envoi des fichiers si présents
      for (const file of form.files) {
        const docRes = await portalApi.post<ApiResponse<{ uploadPath: string }>>(
          `/portail/evaluations/${createdEvaluationId}/documents`,
          {
            typeDocument: "JUSTIFICATIF",
            titre: file.name,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }
        );

        await portalApi.upload(
          docRes.data.uploadPath,
          file,
          file.type || "application/octet-stream",
        );
      }

      navigate("/portail/evaluation/success", {
        replace: true,
        state: {
          evaluation: evalRes.data,
          periodLabel,
          beneficiaryName: session.beneficiaire.dossier
            ? `${session.beneficiaire.dossier.nom} ${session.beneficiaire.dossier.prenom}`
            : "Bénéficiaire",
          serviceName: session.service.nom,
        },
      });
      showToast("Évaluation soumise avec succès", "success");
    } catch (e) {
      if (createdEvaluationId) {
        await portalApi.delete(`/portail/evaluations/${createdEvaluationId}`).catch(() => undefined);
      }
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const updateOccurrence = (index: number, patch: Partial<OccurrenceState>) => {
    setForm(prev => {
      const next = [...prev.occurrences];
      next[index] = { ...next[index], ...patch };
      return { ...prev, occurrences: next };
    });
  };

  const addOccurrence = () => {
    setForm(prev => ({
      ...prev,
      occurrences: [...prev.occurrences, { date: getTodayDateOnly(), present: true }],
    }));
  };

  const removeOccurrence = (index: number) => {
    setForm((prev) => {
      if (prev.occurrences.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        occurrences: prev.occurrences.filter((_, i) => i !== index),
      };
    });
  };

  const changeTrackingType = (nextType: TrackingType) => {
    setForm(prev => ({
      ...prev,
      typeSuivi: nextType,
      occurrences: buildDefaultOccurrences(nextType, session?.periodeCourante || getTodayDateOnly()),
    }));
  };

  if (!token) {
    return <Navigate to="/portail" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f5] text-on-surface-variant">
        <Loader2 size={26} className="animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/portail"
            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </Link>

          <div className="mt-8 rounded-[28px] border border-error/20 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-3 text-on-error-container">
              <AlertCircle size={22} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-lg font-bold">Session indisponible</p>
                <p className="mt-2 text-sm">{error || "Impossible de récupérer la session partenaire."}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  clearPortalToken();
                  navigate("/portail", { replace: true });
                }}
                className="inline-flex rounded-full bg-[#17362e] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#20483d]"
              >
                Revenir à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/portail"
            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </Link>

          <button
            type="button"
            onClick={() => {
              clearPortalToken();
              navigate("/portail", { replace: true });
            }}
            className="inline-flex items-center gap-2 self-start rounded-full border border-surface-high bg-white px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low"
          >
            <LogOut size={15} />
            Fermer la session
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div
              className="rounded-[28px] p-6 text-white shadow-sm"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(205,230,221,0.16), transparent 28%), linear-gradient(135deg, #17362e 0%, #2e4d44 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14">
                  <Shield size={20} className="text-primary-fixed" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                    Période
                  </p>
                  <h1 className="mt-1 text-2xl font-bold capitalize">
                    {periodLabel}
                  </h1>
                </div>
              </div>

              <div className="mt-8 space-y-4 text-sm leading-7 text-white/76">
                <p>Vous êtes connecté en tant que partenaire externe autorisé pour ce suivi.</p>
                <p>La présente évaluation concerne uniquement le mois affiché et ne peut être soumise qu’une seule fois.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-surface-high bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-on-surface">Contexte du suivi</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    Bénéficiaire
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {session.beneficiaire.dossier
                      ? `${session.beneficiaire.dossier.nom} ${session.beneficiaire.dossier.prenom}`
                      : "Bénéficiaire"}
                  </p>
                </div>
                <div className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <UserRound size={16} className="mt-0.5 shrink-0" />
                  <span>{session.beneficiaire.dossier?.numeroDossier || "Dossier indisponible"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <ClipboardList size={16} className="mt-0.5 shrink-0" />
                  <span>{session.libelleSuivi}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>{session.lieuAttendu || session.obligation?.lieu || "Lieu non précisé"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <CalendarDays size={16} className="mt-0.5 shrink-0" />
                  <span>{session.frequenceAttendue || session.obligation?.frequence || "Fréquence non précisée"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-surface-high bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-on-surface">Service connecté</h2>
              <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">{session.service.nom}</p>
                <p>{SERVICE_EXTERNE_TYPE_LABELS[session.service.type as keyof typeof SERVICE_EXTERNE_TYPE_LABELS] || session.service.type}</p>
                <p>{session.service.email}</p>
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-surface-high bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Formulaire d’évaluation
                </p>
                <h2 className="mt-2 text-2xl font-bold text-on-surface">
                  Évaluation — {periodLabel}
                </h2>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                  Renseignez la présence du bénéficiaire, le niveau de conformité et vos observations pour le mois en cours.
                </p>
              </div>
            </div>

            <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Type de suivi
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      value: "QUOTIDIEN" as TrackingType,
                      title: "Quotidien",
                      description: "Tous les jours du mois sont proposés automatiquement.",
                    },
                    {
                      value: "HEBDOMADAIRE" as TrackingType,
                      title: "Hebdomadaire",
                      description: "Quatre repères par défaut, modifiables selon le besoin.",
                    },
                    {
                      value: "MENSUEL" as TrackingType,
                      title: "Mensuel",
                      description: "Une seule date principale, modifiable librement.",
                    },
                  ].map((option) => {
                    const active = form.typeSuivi === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changeTrackingType(option.value)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                          active ? "border-primary bg-primary-fixed/60" : "border-surface-high bg-surface-highest"
                        }`}
                      >
                        <p className="text-sm font-bold text-on-surface">{option.title}</p>
                        <p className="mt-1 text-xs leading-6 text-on-surface-variant">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section Dates et Présences */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    Suivi et présences du mois
                  </p>
                  {form.typeSuivi !== "QUOTIDIEN" && (
                    <button
                      type="button"
                      onClick={addOccurrence}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <Plus size={14} /> Ajouter une date
                    </button>
                  )}
                </div>

                <div className="rounded-2xl bg-surface-low px-4 py-3 text-xs text-on-surface-variant">
                  {getTrackingDescription(form.typeSuivi)}
                </div>

                {form.typeSuivi === "QUOTIDIEN" && (
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex gap-3">
                      <AlertCircle size={18} className="shrink-0 text-primary" />
                      <p className="text-sm leading-6 text-on-surface">
                        <span className="font-bold text-primary">Suivi quotidien :</span> Toutes les dates du mois sont marquées comme <span className="font-bold">Présent</span> par défaut. Utilisez la recherche ci-dessous pour trouver une date précise et modifier son statut si nécessaire.
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative mb-4">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
                  />
                  <input
                    type="text"
                    placeholder="Rechercher une date (ex: 03/04/2026)..."
                    value={occurrenceSearch}
                    onChange={(e) => setOccurrenceSearch(e.target.value)}
                    className="h-11 w-full rounded-xl border border-surface-high bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid gap-3">
                  {filteredOccurrences.map((occ) => {
                    // On retrouve l'index réel dans le tableau d'origine pour les mises à jour
                    const realIdx = form.occurrences.findIndex(o => o.date === occ.date);
                    if (realIdx === -1) return null;

                    const canDelete = form.occurrences.length > 1; // Le bouton de suppression est réactivé pour tous les types de suivi
                    const isDaily = form.typeSuivi === "QUOTIDIEN";
                    return (
                      <div
                        key={`${occ.date}-${realIdx}`}
                        className="flex flex-col gap-3 rounded-xl border border-surface-high bg-surface-highest p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                            Date
                          </label>
                          <input
                            type="date"
                            value={occ.date}
                            readOnly={isDaily}
                            onChange={(e) => updateOccurrence(realIdx, { date: e.target.value })}
                            className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-on-surface outline-none ring-1 ring-surface-high transition focus:ring-primary"
                          />
                        </div>
                        <div className="flex flex-1 items-center gap-2 sm:justify-center">
                          <button
                            type="button"
                            onClick={() => updateOccurrence(realIdx, { present: true })}
                            className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-colors ${
                              occ.present ? "bg-[#17362e] text-white" : "bg-white text-on-surface-variant"
                            }`}
                          >
                            Présent
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOccurrence(realIdx, { present: false })}
                            className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-colors ${
                              !occ.present ? "bg-error-container text-on-error-container" : "bg-white text-on-surface-variant"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => removeOccurrence(realIdx)}
                            disabled={!canDelete}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-on-surface-variant transition-colors hover:bg-surface-low hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Supprimer la date"
                            title="Supprimer la date"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {form.typeSuivi !== "QUOTIDIEN" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addOccurrence}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-surface-high transition-colors hover:bg-surface-low"
                    >
                      <Plus size={14} />
                      Ajouter une ligne
                    </button>
                  </div>
                )}
              </div>

              

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Niveau de conformité
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      value: "SATISFAISANT" as const,
                      title: "Satisfaisant",
                      description: "Le suivi est assuré correctement.",
                    },
                    {
                      value: "A_SURVEILLER" as const,
                      title: "À surveiller",
                      description: "Des points d’attention existent mais restent maîtrisables.",
                    },
                    {
                      value: "PREOCCUPANT" as const,
                      title: "Préoccupant",
                      description: "La situation nécessite une vigilance renforcée.",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          conformite: option.value,
                        }))
                      }
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        form.conformite === option.value
                          ? "border-primary bg-primary-fixed/60"
                          : "border-surface-high bg-surface-low"
                      }`}
                    >
                      <p className="font-semibold text-on-surface">{option.title}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Pièces Jointes */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Justificatifs et documents (Optionnel)
                </p>
                <div className="rounded-2xl border-2 border-dashed border-surface-high p-6 text-center">
                  <input
                    type="file"
                    multiple
                    id="evaluation-files"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setForm(prev => ({ ...prev, files: [...prev.files, ...Array.from(e.target.files!)] }));
                      }
                    }}
                  />
                  <label htmlFor="evaluation-files" className="cursor-pointer">
                    <Paperclip size={24} className="mx-auto text-outline-variant" />
                    <p className="mt-2 text-sm font-semibold text-primary">Cliquez pour ajouter des fichiers</p>
                    <p className="text-xs text-on-surface-variant">Attestations de présence, ordonnances, etc.</p>
                  </label>
                </div>
                {form.files.length > 0 && (
                  <div className="space-y-2">
                    {form.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-surface-low px-3 py-2 text-sm">
                        <span className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-primary" />
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))}
                          className="text-on-surface-variant hover:text-error"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Observations
                </label>
                <textarea
                  value={form.observations}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, observations: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-surface-high bg-surface-highest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  placeholder="Indiquez les observations utiles sur le déroulement du suivi."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17362e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20483d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                Soumettre l’évaluation
              </button>
            </form>
          </section>
        </div>

        {/* Historique compact en bas */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#17362e] text-white">
              <ClipboardList size={20} />
            </div>
            <h2 className="text-xl font-bold text-on-surface">Anciennes évaluations</h2>
          </div>

          {historyLoading ? (
            <div className="flex py-12 justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : history.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-high p-12 text-center text-on-surface-variant">
              Aucune évaluation passée pour ce bénéficiaire.
            </div>
          ) : (
            <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1">
              {history.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => { setSelectedHistoryId(ev.id); setIsDrawerOpen(true); }}
                  className="flex items-center justify-between rounded-[24px] border border-surface-high bg-white px-6 py-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface capitalize">
                      {formatPeriodLabel(ev.periodeMois)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {ev.frequenceSuivi} • {ev.occurrences.length} date(s) • Soumis le{" "}
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      ev.conformite === "SATISFAISANT" ? "bg-primary-fixed text-[#17362e]" : "bg-error-container text-on-error-container"
                    }`}>
                      {ev.conformite}
                    </span>
                    <ArrowUpRight size={18} className="text-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Drawer de détail historique */}
      <SideDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} showCloseButton>
        {selectedHistoryItem && (
          <div className="space-y-6 p-8">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Détail complet de l’évaluation
              </span>
              <h2 className="text-3xl font-extrabold text-[#17362e] capitalize">
                {formatPeriodLabel(selectedHistoryItem.periodeMois)}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {selectedHistoryItem.affectation?.libelleSuivi ?? "Suivi"} • {selectedHistoryItem.frequenceSuivi}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Bénéficiaire</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {selectedHistoryItem.beneficiaire?.dossier
                    ? `${selectedHistoryItem.beneficiaire.dossier.nom} ${selectedHistoryItem.beneficiaire.dossier.prenom}`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {selectedHistoryItem.beneficiaire?.dossier?.numeroDossier || "Dossier indisponible"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Service</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.service?.nom ?? "—"}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{selectedHistoryItem.service?.email ?? "—"}</p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Période</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{formatPeriodLabel(selectedHistoryItem.periodeMois)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Date du constat : {selectedHistoryItem.dateConstat}</p>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Conformité</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.conformite}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Présence globale : {selectedHistoryItem.present ? "Présent" : "Absent"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  Informations de suivi
                </p>
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#17362e]">
                  {selectedHistoryItem.frequenceSuivi}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Affection</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.affectation?.libelleSuivi ?? "—"}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Code : {selectedHistoryItem.affectation?.codeSuivi ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Type de suivi</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.affectation?.typeSuivi ?? "—"}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Obligation liée : {selectedHistoryItem.obligation?.type || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                Obligation associée
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Type</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.obligation?.type || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Fréquence</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.obligation?.frequence || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Lieu</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{selectedHistoryItem.obligation?.lieu || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Catégorie</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {selectedHistoryItem.obligation?.categorie?.nom || "—"}
                  </p>
                </div>
              </div>
              {selectedHistoryItem.obligation?.description ? (
                <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-on-surface">
                  {selectedHistoryItem.obligation.description}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                Observations et commentaires
              </p>
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Observations</p>
                  <p className="mt-1 text-sm leading-7 text-on-surface">
                    {selectedHistoryItem.observations || "Aucune observation renseignée."}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Commentaire libre</p>
                  <p className="mt-1 text-sm leading-7 text-on-surface">
                    {selectedHistoryItem.commentaire || "Aucun commentaire libre."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                Occurrences de suivi
              </p>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {(selectedHistoryItem.occurrences || []).map((occ) => (
                  <div key={occ.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-on-surface">{occ.dateSuivi}</p>
                      <p className="text-xs text-on-surface-variant">Détail de l’occurrence</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      occ.present ? "bg-primary-fixed text-[#17362e]" : "bg-error-container text-on-error-container"
                    }`}>
                      {occ.present ? "Présent" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                Pièces jointes
              </p>
              {selectedHistoryItem.documents.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedHistoryItem.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={`${API_BASE_URL}${doc.portalDownloadUrl || doc.downloadUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm transition-colors hover:bg-surface-low"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{doc.titre}</p>
                        <p className="truncate text-xs text-on-surface-variant">{doc.fileName || doc.typeDocument}</p>
                      </div>
                      <ArrowUpRight size={14} className="shrink-0 text-primary" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">Aucune pièce jointe associée.</p>
              )}
            </div>

            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                Métadonnées
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Créée le</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(selectedHistoryItem.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Mise à jour</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(selectedHistoryItem.updatedAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Identifiant</p>
                  <p className="mt-1 text-xs font-mono text-on-surface">{selectedHistoryItem.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Bénéficiaire</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {selectedHistoryItem.beneficiaire?.id ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="w-full rounded-xl bg-[#17362e] py-3 text-sm font-bold text-white transition-colors hover:bg-[#20483d]"
            >
              Fermer le détail
            </button>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
