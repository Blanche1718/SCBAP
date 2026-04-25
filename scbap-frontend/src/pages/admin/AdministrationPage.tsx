import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Save,
  Shield,
  UserRound,
  UserRoundCog,
  Users,
} from "lucide-react";
import { api } from "../../lib/api";
import type { ApiResponse } from "../../types";

type Role = {
  id: string;
  nom: string;
};

type Structure = {
  id: string;
  nom: string;
  code: string;
  type: string;
  juridiction?: string | null;
};

type UserRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  statut: string;
  createdAt: string;
  role: Role;
  structure: Structure;
};

type UsersMeta = {
  roles: Role[];
  structures: Structure[];
};

type FormState = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: string;
  roleId: string;
  structureId: string;
};

const DEFAULT_FORM: FormState = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  statut: "ACTIF",
  roleId: "",
  structureId: "",
};

export default function AdministrationPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<UsersMeta>({ roles: [], structures: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("TOUS");
  const [structureFilter, setStructureFilter] = useState("TOUS");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [selectedId, users],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [usersRes, metaRes] = await Promise.all([
          api.get<ApiResponse<UserRow[]>>("/users"),
          api.get<ApiResponse<UsersMeta>>("/users/meta"),
        ]);

        if (!active) {
          return;
        }

        setUsers(usersRes.data);
        setMeta(metaRes.data);

        if (usersRes.data.length > 0) {
          setSelectedId(usersRes.data[0].id);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
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
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      nom: selectedUser.nom,
      prenom: selectedUser.prenom,
      email: selectedUser.email,
      telephone: selectedUser.telephone ?? "",
      statut: selectedUser.statut,
      roleId: selectedUser.role.id,
      structureId: selectedUser.structure.id,
    });
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = [
        user.nom,
        user.prenom,
        user.email,
        user.role.nom,
        user.structure.nom,
        user.structure.code,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesRole = roleFilter === "TOUS" || user.role.nom === roleFilter;
      const matchesStructure =
        structureFilter === "TOUS" || user.structure.id === structureFilter;

      return matchesSearch && matchesRole && matchesStructure;
    });
  }, [roleFilter, search, structureFilter, users]);

  const counts = useMemo(() => {
    const activeCount = users.filter((user) => user.statut === "ACTIF").length;
    const suspendedCount = users.filter((user) => user.statut === "SUSPENDU").length;
    const adminCount = users.filter((user) => user.role.nom === "ADMIN").length;

    return {
      total: users.length,
      actifs: activeCount,
      admins: adminCount,
      suspendus: suspendedCount,
    };
  }, [users]);

  const pageStart = filteredUsers.length === 0 ? 0 : 1;
  const pageEnd = filteredUsers.length;

  async function reloadUsers() {
    setLoading(true);
    try {
      const [usersRes, metaRes] = await Promise.all([
        api.get<ApiResponse<UserRow[]>>("/users"),
        api.get<ApiResponse<UsersMeta>>("/users/meta"),
      ]);
      setUsers(usersRes.data);
      setMeta(metaRes.data);

      if (!selectedId && usersRes.data.length > 0) {
        setSelectedId(usersRes.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      setGeneratedPassword(null);

      const payload = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone.trim() || null,
        statut: form.statut,
        roleId: form.roleId,
        structureId: form.structureId,
      };

      const res = await api.patch<ApiResponse<UserRow>>(`/users/${selectedUser.id}`, payload);
      const updatedUser = res.data;

      setUsers((current) =>
        current.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      setSelectedId(updatedUser.id);
      setMessage("Utilisateur mis à jour avec succès.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      setResettingId(userId);
      setError(null);
      setMessage(null);
      setGeneratedPassword(null);

      const res = await api.post<ApiResponse<{ password: string }>>(
        `/users/${userId}/reset-password`,
        {},
      );

      setGeneratedPassword(res.data.password);
      setMessage("Mot de passe réinitialisé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du reset");
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface">
      <div className="rounded-lg px-6 py-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-6 lg:gap-8 text-white"
        style={{ background: "linear-gradient(135deg, #17362e 0%, #2e4d44 60%, #93000a 160%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <Shield size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.total}</p>
            <p className="text-xs text-white/70 font-medium">Utilisateurs total</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.actifs}</p>
            <p className="text-xs text-white/70 font-medium">Comptes actifs</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <UserRoundCog size={16} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.admins}</p>
            <p className="text-xs text-white/70 font-medium">Administrateurs</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-10 bg-white/15" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center">
            <AlertCircle size={16} className="text-error-container" />
          </div>
          <div>
            <p className="text-xl font-bold">{counts.suspendus}</p>
            <p className="text-xs text-white/70 font-medium">Comptes suspendus</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <UserRoundCog size={20} className="text-primary" />
            Administration
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Gestion des comptes et des accès du système
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold text-[#2e4d44] uppercase tracking-wider">
            <Shield size={12} />
            Accès sensible
          </span>
          <button
            type="button"
            onClick={reloadUsers}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44]"
          >
            <RefreshCw size={14} />
            Recharger
          </button>
        </div>
      </div>

      {(message || generatedPassword || error) && (
        <div className="mb-4 space-y-2">
          {message && (
            <p className="text-xs font-medium text-on-secondary-container">{message}</p>
          )}
          {generatedPassword && (
            <p className="text-xs font-medium text-on-secondary-container">
              Mot de passe par défaut: <span className="font-bold">{generatedPassword}</span>
            </p>
          )}
          {error && (
            <div className="flex items-center gap-3 p-5 rounded-lg bg-error-container text-on-error-container">
              <AlertCircle size={16} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="relative w-full lg:max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-md bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[38rem]">
          <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Rôle
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Tous les rôles</option>
              {meta.roles.map((role) => (
                <option key={role.id} value={role.nom}>
                  {role.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
            Structure
            <select
              value={structureFilter}
              onChange={(event) => setStructureFilter(event.target.value)}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TOUS">Toutes les structures</option>
              {meta.structures.map((structure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.nom}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("TOUS");
                setStructureFilter("TOUS");
              }}
              className="w-full rounded-md bg-surface-high px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2e4d44] hover:bg-[#d9dddb] transition-colors"
            >
              Effacer filtres
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.85fr]">
        <div>
          <div className="hidden sm:grid grid-cols-[40px_minmax(0,1fr)_170px_170px_120px_170px] items-center gap-4 px-5 py-2 mb-2">
            <div className="w-10 shrink-0" />
            <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
              <UserRound size={12} className="text-on-error-container shrink-0" />
              <span className="leading-none">Utilisateur</span>
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
                <Shield size={12} className="text-on-error-container shrink-0" />
                <span className="leading-none">Rôle</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container flex items-center gap-2">
                <Building2 size={12} className="text-on-error-container shrink-0" />
                <span className="leading-none">Structure</span>
              </div>
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container inline-flex items-center justify-end gap-2">
                <AlertCircle size={12} className="text-on-error-container shrink-0" />
                <span className="leading-none">Statut</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container inline-flex items-center justify-end gap-2">
                <RefreshCw size={12} className="text-on-error-container shrink-0" />
                <span className="leading-none">Actions</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-on-surface-variant gap-3">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="text-sm">Chargement des utilisateurs…</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun utilisateur trouve</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredUsers.map((user) => {
                const isSelected = user.id === selectedId;

                return (
                  <div
                    key={user.id}
                    className={`rounded-lg border border-transparent transition-colors ${
                      isSelected ? "bg-[#eef8f4] hover:border-primary" : "hover:border-surface-high"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className="w-full grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_170px_170px_120px_170px] items-center gap-4 px-5 py-4 rounded-lg bg-white hover:bg-surface transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-md bg-[#6f0015] text-error-container flex items-center justify-center text-xs font-bold shrink-0">
                        {(user.prenom[0] ?? "A") + (user.nom[0] ?? "P")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {user.prenom} {user.nom}
                        </p>
                        <p className="text-xs text-on-secondary-container font-mono mt-0.5 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-on-surface-variant truncate">{user.role.nom}</p>
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-xs text-on-surface-variant truncate">
                          {user.structure.nom}
                        </p>
                      </div>
                      <div className="hidden lg:flex justify-end">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            user.statut === "ACTIF"
                              ? "bg-primary-fixed text-[#2e4d44]"
                              : user.statut === "SUSPENDU"
                                ? "bg-error-container text-on-error-container"
                                : "bg-secondary-container text-on-secondary-container"
                          }`}
                        >
                          {user.statut}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-surface-low px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2e4d44] hover:bg-surface-high transition-colors"
                          onClick={() => setSelectedId(user.id)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resettingId === user.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2e4d44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {resettingId === user.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <KeyRound size={14} />
                          )}
                          Reset
                        </button>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 rounded-lg bg-white px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-on-surface-variant">
              {filteredUsers.length === 0 ? (
                "Aucun utilisateur à afficher"
              ) : (
                <>
                  Affichage de <span className="font-semibold text-on-surface">{pageStart}</span>{" "}
                  à <span className="font-semibold text-on-surface">{pageEnd}</span> sur{" "}
                  <span className="font-semibold text-on-surface">{filteredUsers.length}</span>{" "}
                  utilisateur(s)
                </>
              )}
            </div>
            <div className="text-xs text-on-surface-variant">
              Sélectionnez une ligne pour charger la fiche détaillée à droite.
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary-fixed flex items-center justify-center text-[#2e4d44]">
                <UserRoundCog size={16} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Fiche utilisateur</h2>
                <p className="text-sm text-on-surface-variant">
                  {selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : "Sélectionnez un compte"}
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Nom
                  <input
                    value={form.nom}
                    onChange={(event) => setForm({ ...form, nom: event.target.value })}
                    className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                  />
                </label>
                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Prénom
                  <input
                    value={form.prenom}
                    onChange={(event) => setForm({ ...form, prenom: event.target.value })}
                    className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                  />
                </label>
              </div>

              <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                Email
                <input
                  value={form.email}
                  disabled
                  className="mt-2 w-full rounded-md bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface-variant outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                Téléphone
                <input
                  value={form.telephone}
                  onChange={(event) => setForm({ ...form, telephone: event.target.value })}
                  className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Rôle
                  <select
                    value={form.roleId}
                    onChange={(event) => setForm({ ...form, roleId: event.target.value })}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                  >
                    {meta.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                  Structure
                  <select
                    value={form.structureId}
                    onChange={(event) => setForm({ ...form, structureId: event.target.value })}
                    className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                  >
                    {meta.structures.map((structure) => (
                      <option key={structure.id} value={structure.id}>
                        {structure.nom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-xs font-semibold text-on-secondary-container uppercase tracking-wider">
                Statut
                <select
                  value={form.statut}
                  onChange={(event) => setForm({ ...form, statut: event.target.value })}
                  className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-b-2 focus:border-primary transition-all"
                >
                  <option value="ACTIF">ACTIF</option>
                  <option value="INACTIF">INACTIF</option>
                  <option value="SUSPENDU">SUSPENDU</option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !selectedUser}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => selectedUser && handleResetPassword(selectedUser.id)}
                  disabled={!selectedUser || resettingId === selectedUser.id}
                  className="inline-flex items-center gap-2 rounded-md bg-surface-high px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2e4d44] transition-colors hover:bg-[#d9dddb] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resettingId === selectedUser?.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <KeyRound size={14} />
                  )}
                  Reset password
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-lg bg-surface-container-low p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
              Note
            </p>
            <p className="mt-2 text-sm text-on-surface-variant leading-6">
              Le reset remet le mot de passe au mot de passe par défaut du système. L&apos;email
              reste l&apos;identifiant de connexion et ne peut pas être modifié depuis la fiche
              personnelle.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
