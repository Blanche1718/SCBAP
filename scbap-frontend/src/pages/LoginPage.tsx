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
    <div className="min-h-screen bg-[#e9efec] text-on-surface">
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(23,54,46,0.16),transparent_30%),radial-gradient(circle_at_86%_78%,rgba(147,0,10,0.12),transparent_28%),linear-gradient(135deg,#f7faf8_0%,#dbe5e0_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(23,54,46,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(23,54,46,0.10)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_34px_90px_rgba(23,54,46,0.22)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,0.85fr)]">
          <section className="relative hidden min-h-[620px] overflow-hidden bg-[#17362e] text-white lg:block">
            <img
              src="/image2.png"
              alt="Justice et supervision judiciaire"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#17362e]/92 via-[#17362e]/64 to-[#93000a]/50" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#17362e] to-transparent" />

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 backdrop-blur">
                  <img src="/logo.png" alt="SCBAP Logo" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.24em]">SCBAP</p>
                  <p className="mt-1 text-xs font-semibold text-white/60">République du Bénin</p>
                </div>
              </div>

              <div className="max-w-lg">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                  <Shield size={12} />
                  Accès sécurisé
                </div>
                <h1 className="text-4xl font-extrabold leading-tight tracking-normal xl:text-5xl">
                  Supervision judiciaire et suivi opérationnel
                </h1>
                <p className="mt-5 max-w-md text-sm leading-7 text-white/72">
                  Accédez aux dossiers, alertes, services partenaires et rapports depuis un espace unifié.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-lg font-bold">24/7</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/58">Surveillance</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-lg font-bold">GPS</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/58">Alertes</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-lg font-bold">DAPG</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/58">Synchronisé</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-[620px] items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/10 bg-surface-container-lowest shadow-[0_18px_38px_-18px_rgba(23,54,46,0.55)]">
                  <img src="/logo.png" alt="SCBAP Logo" className="h-9 w-9 object-contain" />
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm font-bold text-primary">Bonjour,</p>
                <h2 className="mt-1 text-3xl font-extrabold text-[#17362e]">
                  Connexion
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  Connectez-vous avec votre compte pour accéder au tableau de bord SCBAP.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-high bg-white p-5 shadow-[0_18px_50px_rgba(23,54,46,0.08)] sm:p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-[#2e4d44]">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-on-surface">Identifiez-vous</h3>
                    <p className="text-xs text-on-surface-variant">Session agent autorisée</p>
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
              </div>

              <p className="mt-6 text-center text-[11px] font-medium leading-5 text-on-surface-variant">
                Accès réservé au personnel autorisé. Les connexions sont enregistrées.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
