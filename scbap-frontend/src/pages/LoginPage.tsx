import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import {
  ArrowRight,
  Lock,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  useEffect(() => {
    document.title = "SCBAP Bénin - Connexion sécurisée";
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [from, loading, navigate, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(email, motDePasse);
      showToast("Connexion réussie", "success");
      navigate(from, { replace: true });
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Shield size={28} className="animate-pulse text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  function handleForgotPasswordClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    showToast("Veuillez contacter le support Justice pour réinitialiser votre mot de passe.", "info");
  }

  return (
    <div className="min-h-screen bg-[#17362e] text-white">
      <main className="relative min-h-screen overflow-hidden">
        <img
          src="/image2.png"
          alt="Justice et supervision judiciaire"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#17362e]/96 via-[#17362e]/76 to-[#93000a]/54" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,28,24,0.92)_0%,rgba(8,28,24,0.72)_42%,rgba(8,28,24,0.38)_68%,rgba(8,28,24,0.18)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0d2923] to-transparent" />

        <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-14 xl:px-20">
          <header className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 backdrop-blur">
              <img src="/logo.png" alt="SCBAP Logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.24em]">SCBAP</p>
              <p className="mt-1 text-xs font-semibold text-white/64">République du Bénin</p>
            </div>
          </header>

          <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.95fr)_440px] xl:grid-cols-[minmax(0,0.95fr)_460px]">
            <div className="max-w-2xl">
              {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/82 backdrop-blur">
                <Shield size={12} />
                Accès sécurisé
              </div> */}
              <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl xl:text-6xl">
                Supervision judiciaire et suivi opérationnel
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/74 sm:text-base">
                Accédez aux dossiers, alertes, services partenaires et rapports depuis un espace unifié.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-white/60 bg-white/96 p-5 text-on-surface shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur sm:p-7 lg:justify-self-start">
              <div className="mb-8 max-w-md">
                {/* <p className="text-sm font-bold text-primary">Bonjour,</p> */}
                <h2 className="mt-1 text-3xl font-extrabold text-[#17362e]">
                  Connexion
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  Connectez-vous avec votre compte pour accéder au tableau de bord SCBAP.
                </p>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-[#2e4d44]">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">Identifiez-vous</h3>
                  {/* <p className="text-xs text-on-surface-variant">Session agent autorisée</p> */}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Identifiant / E-mail
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <UserRound size={18} className="text-outline" />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="agent.spip@scbap.bj"
                      className="h-12 w-full rounded-lg border border-surface-high bg-surface-highest pl-12 pr-4 text-sm font-medium text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Mot de passe
                    </label>
                    <a
                      href="#"
                      onClick={handleForgotPasswordClick}
                      className="text-xs font-bold text-error transition-all hover:underline"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock size={18} className="text-outline" />
                    </div>
                    <input
                      type="password"
                      value={motDePasse}
                      onChange={(event) => setMotDePasse(event.target.value)}
                      placeholder="••••••••••••"
                      className="h-12 w-full rounded-lg border border-surface-high bg-surface-highest pl-12 pr-4 text-sm font-medium text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white shadow-[0_18px_40px_-18px_rgba(23,54,46,0.75)] transition-all hover:bg-[#2e4d44] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{submitting ? "Connexion en cours..." : "Se connecter"}</span>
                  {submitting ? (
                    <Sparkles size={18} className="animate-pulse" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              </form>

              {/* <p className="mt-6 text-center text-[11px] font-medium leading-5 text-on-surface-variant">
                Accès réservé au personnel autorisé. Les connexions sont enregistrées.
              </p> */}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
