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
    <div className="min-h-screen bg-surface text-on-surface">
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(23,54,46,0.08),_transparent_30%),radial-gradient(circle_at_right,_rgba(185,26,26,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(23,54,46,0.05),_transparent_22%),linear-gradient(180deg,rgba(248,250,249,0.98),rgba(242,244,243,1))]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(113,121,117,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(113,121,117,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-error to-primary" />

        <div className="relative w-full max-w-md">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.35rem] border border-primary/10 bg-surface-container-lowest shadow-[0_24px_50px_-18px_rgba(23,54,46,0.35)]">
              <img src="/logo.png" alt="SCBAP Logo" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="headline text-3xl font-extrabold uppercase tracking-[0.26em] text-primary drop-shadow-sm">
              SCBAP Bénin
            </h1>
            
          </div>

          <section className="relative overflow-hidden rounded-[1.25rem] border border-outline-variant/35 bg-surface-container-lowest p-8 shadow-[0_32px_64px_-12px_rgba(23,54,46,0.16)] md:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-error to-primary-container" />
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-on-primary-fixed">
                <Shield size={12} />
                Portail d’accès
              </div>
              <h2 className="headline text-xl font-bold text-on-surface">Connexion sécurisée</h2>
              <p className="mx-auto mt-4 max-w-sm text-sm text-on-surface-variant">
                Connectez-vous pour accéder au tableau de supervision, aux dossiers et au suivi
                opérationnel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
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
                    className="w-full rounded-md border border-outline-variant/50 bg-surface-container-highest py-4 pl-12 pr-4 text-on-surface outline-none transition-all placeholder:text-outline focus:border-error focus:ring-2 focus:ring-error/10 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
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
                    className="w-full rounded-md border border-outline-variant/50 bg-surface-container-highest py-4 pl-12 pr-4 text-on-surface outline-none transition-all placeholder:text-outline focus:border-error focus:ring-2 focus:ring-error/10 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary via-primary-container to-error py-4 font-bold text-on-primary shadow-[0_18px_40px_-18px_rgba(23,54,46,0.7)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{submitting ? "Connexion en cours..." : "Se connecter au tableau de bord"}</span>
                  {submitting ? (
                    <Sparkles size={18} className="animate-pulse" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              </div>
            </form>

            {/* <div className="mt-8 flex items-start gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
              <ShieldAlert size={20} className="mt-0.5 text-primary" />
              <p className="text-[11px] leading-relaxed font-medium text-on-surface-variant">
                L’accès à ce système est réservé au personnel autorisé. Toutes les connexions sont
                surveillées et enregistrées selon le protocole en vigueur.
              </p>
            </div> */}
          </section>

        </div>
      </main>

      {/* <footer className="px-2 py-8 m:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-xs font-medium text-outline">© 2024 SCBAP Bénin</div>
        </div>
      </footer> */}
    </div>
  );
}
