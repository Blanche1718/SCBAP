import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  GraduationCap,
  Loader2,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { portalApi } from "../../lib/portalApi";
import { getPortalToken, setPortalToken } from "../../lib/portalAuth";
import { useToast } from "../../context/ToastContext";
import type {
  ApiResponse,
  PortalAuthResponse,
} from "../../types";

type AccessTab = "request-code" | "login";

type LoginFormState = {
  codeSuivi: string;
  codeService: string;
};

const DEFAULT_LOGIN_FORM: LoginFormState = {
  codeSuivi: "",
  codeService: "",
};

const HERO_SLIDES = [
  {
    src: "/image.png",
    alt: "Scène liée à la justice",
    position: "center center",
  },
  {
    src: "/image1.png",
    alt: "Illustration institutionnelle de justice",
    position: "center center",
  },
  {
    src: "/image2.png",
    alt: "Scène de travail social",
    position: "center center",
  },
];

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function PortalModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AccessTab>("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>(DEFAULT_LOGIN_FORM);
  const [loginLoading, setLoginLoading] = useState(false);

  const hasPortalToken = useMemo(() => Boolean(getPortalToken()), []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);

    try {
      const res = await portalApi.post<ApiResponse<PortalAuthResponse>>("/portail/auth", {
        codeSuivi: normalizeCode(loginForm.codeSuivi),
        codeService: loginForm.codeService.trim(),
      });

      setPortalToken(res.data.token);
      showToast("Connexion réussie", "success");
      onClose();
      navigate("/portail/evaluation");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setLoginLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#10241f]/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-high px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Accès partenaire
            </p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              Portail d’évaluation SCBAP
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="bg-[#17362e] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14">
                <Shield size={18} className="text-primary-fixed" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  SCBAP
                </p>
                <p className="text-lg font-bold">Partenaires externes</p>
              </div>
            </div>

            <div className="mt-8 space-y-4 text-sm leading-7 text-white/78">
              <p>Accès au portail réservé aux services partenaires autorisés.</p>
              <p>Connexion : utilisez le code de suivi fourni par le détenu avec le code d'accès reçu par mail.</p>
              <p>Chaque évaluation est rattachée au mois en cours et ne peut être soumise qu’une seule fois.</p>
            </div>

            {hasPortalToken && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/portail/evaluation");
                }}
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Continuer l'évaluation en cours
              </button>
            )}
          </div>

          <div className="px-6 py-6">
            <div className="mb-5 inline-flex rounded-full bg-surface-low p-1">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "login"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Se connecter
              </button>
            </div>

            {activeTab === "login" && (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    Code de suivi
                  </label>
                  <input
                    value={loginForm.codeSuivi}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        codeSuivi: event.target.value.toUpperCase(),
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-surface-high bg-surface-highest px-4 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    placeholder="Ex : SUIV-4K8P2M"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    Code de service reçu par mail
                  </label>
                  <input
                    value={loginForm.codeService}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        codeService: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-surface-high bg-surface-highest px-4 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    placeholder="Ex : 482193"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17362e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20483d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  Se connecter
                </button>
              </form>
            )}

            <p className="mt-5 text-xs leading-6 text-on-surface-variant">
              Le code de suivi vous est communiqué par le bénéficiaire ou l’agent, puis le code de service est envoyé sur votre adresse email professionnelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalLandingPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const partnerCards = [
    {
      icon: Stethoscope,
      title: "Services médicaux",
      description: "Suivi thérapeutique, traitements, consultations et attestations de présence.",
    },
    {
      icon: Briefcase,
      title: "Services d'emploi",
      description: "Insertion professionnelle, embauche, point de présence et encadrement au travail.",
    },
    {
      icon: GraduationCap,
      title: "Organismes de formation",
      description: "Assiduité, progression pédagogique et présence aux sessions prévues.",
    },
    {
      icon: Users,
      title: "Services sociaux",
      description: "Accompagnement communautaire, soutien social et observation de terrain.",
    },
  ];

  const steps = [
    "Recevoir son code de service par mail",
    "Renseigner le code de suivi remis pour le bénéficiaire",
    "Soumettre l’évaluation mensuelle demandée",
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-on-surface">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#17362e]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 p-1.5">
              <img
                src="/logo.png"
                alt="Logo SCBAP"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/68">
                SCBAP
              </p>
              <p className="text-base font-bold">Portail Partenaires</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getPortalToken() && (
              <button
                type="button"
                onClick={() => navigate("/portail/evaluation")}
                className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex"
              >
                Continuer l'évaluation en cours
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#17362e] transition-colors hover:bg-[#e5efe9]"
            >
              Accéder à l'espace d'évaluation
            </button>
          </div>
        </div>
      </header>

      <main>
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #17362e 0%, #2e4d44 100%)",
          }}
        >
          <div className="absolute inset-0">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.src}
                className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${
                  index === activeHeroSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: slide.position }}
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,28,23,0.9)_0%,rgba(14,35,29,0.72)_44%,rgba(18,41,34,0.58)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,227,222,0.18),transparent_28%)]" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-5xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white/85">
                <Sparkles size={16} />
                Plateforme sécurisée d’évaluation externe
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Le portail officiel de suivi des bénéficiaires de l’aménagement de peine
              </h1>
              <p className="mt-6 max-w-4xl text-base leading-8 text-white/78 sm:text-lg lg:max-w-3xl">
                 Connectez-vous pour demarrer vos évaluations mensuelles et contribuer à la réinsertion réussie des bénéficiaires d'amenagement de peine.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#17362e] transition-colors hover:bg-[#e5efe9]"
                >
                  Accéder à l'espace d'évaluation
                </button>
                {/* <button 
                  type="button"
                  onClick={() => navigate("/portail/evaluation")}
                  className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Voir la session en cours 
                </button> */}
              </div>

              <div className="mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl rounded-[24px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/68">
                    Cadre institutionnel
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/78">
                    Un espace partenaire dédié pour transmettre les évaluations demandées dans un environnement, professionnel et sécurisé.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/14 bg-black/10 px-3 py-2 backdrop-blur sm:self-auto">
                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => setActiveHeroSlide(index)}
                      aria-label={`Afficher l'image ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        index === activeHeroSlide
                          ? "w-8 bg-white"
                          : "w-2.5 bg-white/45 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Partenaires concernés
            </p>
            <h2 className="mt-3 text-3xl font-bold text-on-surface">
              Ce portail est destiné aux services partenaires
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {partnerCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[24px] border border-surface-high bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/30 hover:scale-[1.02]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-on-surface">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Parcours
              </p>
              <h2 className="mt-3 text-3xl font-bold text-on-surface">
                Comment ça fonctionne
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-[24px] border border-surface-high bg-[#f7faf8] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#17362e] text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="mt-5 text-lg font-semibold text-on-surface">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-surface-high bg-white px-6 py-10 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#17362e] text-white">
              <Shield size={28} />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-on-surface">
              Plateforme institutionnelle SCBAP
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Ce portail accompagne la remontée d’informations des partenaires impliqués dans le suivi des bénéficiaires de l’aménagement de peine.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-surface-low px-4 py-5">
                <p className="text-xl font-bold text-on-surface">Données sécurisées</p>
              </div>
              <div className="rounded-2xl bg-surface-low px-4 py-5">
                <p className="text-xl font-bold text-on-surface">Accès contrôlé</p>
              </div>
              <div className="rounded-2xl bg-surface-low px-4 py-5">
                <p className="text-xl font-bold text-on-surface">Usage institutionnel</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#17362e]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-white/74 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="font-semibold text-white">SCBAP — Portail Partenaires</p>
          <div className="flex flex-wrap gap-4">
            <span>Portail d’évaluation</span>
            <span>République du Bénin</span>
            <span>Données réservées aux partenaires autorisés</span>
          </div>
        </div>
      </footer>

      <PortalModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
