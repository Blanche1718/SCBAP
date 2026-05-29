import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  LockKeyhole,
  Save,
  Shield,
  UserCog,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import type { ApiResponse } from "../types";

type CurrentUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  statut: string;
  createdAt: string;
  role: {
    id: string;
    nom: string;
  };
  structure: {
    id: string;
    nom: string;
    code: string;
    type: string;
    juridiction?: string | null;
  };
};

type ProfileForm = {
  nom: string;
  prenom: string;
  telephone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ConfigurationPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nom: "",
    prenom: "",
    telephone: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get<ApiResponse<CurrentUser>>("/users/me");
        if (!active) {
          return;
        }

        setCurrentUser(res.data);
        setProfileForm({
          nom: res.data.nom,
          prenom: res.data.prenom,
          telephone: res.data.telephone ?? "",
        });
      } catch (err) {
        if (active) {
          showToast(err instanceof Error ? err.message : "Erreur de chargement", "error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [user]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingProfile(true);

      await api.patch<ApiResponse<CurrentUser>>("/users/me", {
        nom: profileForm.nom.trim(),
        prenom: profileForm.prenom.trim(),
        telephone: profileForm.telephone.trim() || null,
      });

      const refreshed = await refreshUser();
      if (refreshed) {
        setCurrentUser({
          ...refreshed,
          telephone: refreshed.telephone ?? null,
        });
      }

      showToast("Vos informations ont été mises à jour.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingPassword(true);

      await api.patch<ApiResponse<{ message: string }>>("/users/me/password", passwordForm);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showToast("Votre mot de passe a été mis à jour.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erreur lors du changement de mot de passe",
        "error",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f8faf9_0%,#eef4f1_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-outline-variant/70 bg-white/80 p-6 shadow-[0_24px_70px_-30px_rgba(23,54,46,0.25)] backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            <Shield size={13} />
            Configuration
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-on-surface">
            Mes informations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Mettez à jour votre profil et changez votre mot de passe depuis cet espace.
            L&apos;adresse email reste verrouillée pour conserver l’identifiant de connexion.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-outline-variant/70 bg-white/90 py-20 text-on-surface-variant">
            <Loader2 size={22} className="mr-2 animate-spin text-primary" />
            Chargement...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-outline-variant/70 bg-white/90 p-6 shadow-[0_24px_70px_-30px_rgba(23,54,46,0.18)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <UserCog size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Profil utilisateur</h2>
                  <p className="text-sm text-on-surface-variant">Vos coordonnées visibles par l’administration</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Nom</span>
                  <input
                    value={profileForm.nom}
                    onChange={(event) => setProfileForm({ ...profileForm, nom: event.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Prénom</span>
                  <input
                    value={profileForm.prenom}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, prenom: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Téléphone</span>
                  <input
                    value={profileForm.telephone}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, telephone: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Email</span>
                  <input
                    value={currentUser?.email ?? ""}
                    disabled
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-on-surface-variant outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-primary-container disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Enregistrer
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-outline-variant/70 bg-white/90 p-6 shadow-[0_24px_70px_-30px_rgba(23,54,46,0.18)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <LockKeyhole size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Mot de passe</h2>
                  <p className="text-sm text-on-surface-variant">
                    Choisissez un nouveau mot de passe personnel
                  </p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Mot de passe actuel</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">Nouveau mot de passe</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-bold text-on-surface-variant">
                    Confirmer le nouveau mot de passe
                  </span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 outline-none transition focus:border-primary"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-primary-container disabled:opacity-60"
                  >
                    {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Changer le mot de passe
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
