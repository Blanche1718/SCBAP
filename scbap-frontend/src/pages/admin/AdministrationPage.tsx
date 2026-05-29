import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Save,
  Shield,
  Trash2,
  UserRound,
  UserRoundCog,
  Users,
} from "lucide-react";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import type { ApiResponse } from "../../types";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";

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

type AdminSection = "MENU" | "USERS" | "OBLIGATIONS" | "NFC";
type UserDrawerMode = "CREATE" | "EDIT";

type ObligationReference = {
  id: string;
  dapgId?: number | null;
  section?: string | null;
  code: string;
  libelle: string;
  active: boolean;
  categorieId: string;
  categorie: {
    id: string;
    nom: string;
  };
};

type NfcSyncResult = {
  fetched: number;
  recordsWithNfc: number;
  matched: number;
  updated: number;
  unchanged: number;
  conflicts: number;
  missingInScbap: number;
  issues: Array<{
    numeroMandat?: string;
    nfc?: string;
    message: string;
  }>;
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
  const { showToast } = useToast();
  const [adminSection, setAdminSection] = useState<AdminSection>("MENU");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userCreateDrawerOpen, setUserCreateDrawerOpen] = useState(false);
  const [userDrawerMode, setUserDrawerMode] = useState<UserDrawerMode>("CREATE");
  const [createForm, setCreateForm] = useState<FormState>(DEFAULT_FORM);
  const [meta, setMeta] = useState<UsersMeta>({ roles: [], structures: [] });
  const [obligationReferences, setObligationReferences] = useState<ObligationReference[]>([]);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [obligationsError, setObligationsError] = useState<string | null>(null);
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [nfcSyncing, setNfcSyncing] = useState(false);
  const [nfcSyncResult, setNfcSyncResult] = useState<NfcSyncResult | null>(null);
  const [nfcSyncError, setNfcSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [roleFilter, setRoleFilter] = useState("TOUS");
  const [structureFilter, setStructureFilter] = useState("TOUS");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [selectedId, users],
  );

  useEffect(() => {
    function returnToMenu() {
      setAdminSection("MENU");
    }

    window.addEventListener("scbap:administration-home", returnToMenu);
    return () => window.removeEventListener("scbap:administration-home", returnToMenu);
  }, []);

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
          showToast(err instanceof Error ? err.message : "Erreur de chargement", "error");
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

  const totalPages = Math.max(Math.ceil(filteredUsers.length / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredUsers.slice(start, start + limit);
  }, [currentPage, filteredUsers, limit]);
  const pageStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd = filteredUsers.length === 0 ? 0 : pageStart + paginatedUsers.length - 1;

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, structureFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreateUserDrawer() {
    setUserDrawerMode("CREATE");
    setCreateForm(DEFAULT_FORM);
    setUserCreateDrawerOpen(true);
  }

  function openEditUserDrawer(user: UserRow) {
    setSelectedId(user.id);
    setForm({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone ?? "",
      statut: user.statut,
      roleId: user.role.id,
      structureId: user.structure.id,
    });
    setUserDrawerMode("EDIT");
    setUserCreateDrawerOpen(true);
  }

  useEffect(() => {
    if (adminSection === "OBLIGATIONS" && obligationReferences.length === 0) {
      void reloadObligationReferences(true);
    }
  }, [adminSection]);

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

  async function reloadObligationReferences(sync = false) {
    setObligationsLoading(true);
    setObligationsError(null);
    try {
      if (sync) {
        await api.post<ApiResponse<unknown>>("/obligations/references/specifiques/sync", {});
      }
      const res = await api.get<ApiResponse<ObligationReference[]>>("/obligations/references/specifiques");
      setObligationReferences(res.data);
    } catch (err) {
      setObligationsError(err instanceof Error ? err.message : "Erreur de chargement");
      showToast(err instanceof Error ? err.message : "Erreur de chargement", "error");
    } finally {
      setObligationsLoading(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.post<ApiResponse<{ user: UserRow; password: string }>>("/users", {
        nom: createForm.nom.trim(),
        prenom: createForm.prenom.trim(),
        email: createForm.email.trim().toLowerCase(),
        telephone: createForm.telephone.trim() || null,
        statut: createForm.statut,
        roleId: createForm.roleId,
        structureId: createForm.structureId,
      });
      setUsers((current) => [res.data.user, ...current]);
      setSelectedId(res.data.user.id);
      setGeneratedPassword(res.data.password);
      setCreateForm(DEFAULT_FORM);
      setUserCreateDrawerOpen(false);
      showToast("Utilisateur créé avec succès.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors de la création", "error");
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateReference(reference: ObligationReference) {
    try {
      setEditingReferenceId(reference.id);
      const res = await api.put<ApiResponse<ObligationReference>>(
        `/obligations/references/specifiques/${reference.id}`,
        reference,
      );
      setObligationReferences((current) =>
        current.map((item) => (item.id === reference.id ? res.data : item)),
      );
      showToast("Obligation mise à jour.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur de mise à jour", "error");
    } finally {
      setEditingReferenceId(null);
    }
  }

  async function handleDeleteReference(id: string) {
    try {
      setEditingReferenceId(id);
      await api.delete<ApiResponse<ObligationReference>>(`/obligations/references/specifiques/${id}`);
      setObligationReferences((current) => current.filter((item) => item.id !== id));
      showToast("Obligation supprimée.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur de suppression", "error");
    } finally {
      setEditingReferenceId(null);
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
      setUserCreateDrawerOpen(false);
      showToast("Utilisateur mis à jour avec succès.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      setResettingId(userId);
      setError(null);
      setGeneratedPassword(null);

      const res = await api.post<ApiResponse<{ password: string }>>(
        `/users/${userId}/reset-password`,
        {},
      );

      setGeneratedPassword(res.data.password);
      showToast("Mot de passe réinitialisé.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors du reset", "error");
      setError(err instanceof Error ? err.message : "Erreur lors du reset");
    } finally {
      setResettingId(null);
    }
  }

  async function handleSyncNfcBadges() {
    try {
      setNfcSyncing(true);
      setNfcSyncError(null);
      const res = await api.post<ApiResponse<NfcSyncResult>>("/biometrie/nfc/sync", {});
      setNfcSyncResult(res.data);
      showToast(res.message || "Synchronisation NFC terminée.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de synchronisation NFC";
      setNfcSyncError(message);
      showToast(message, "error");
    } finally {
      setNfcSyncing(false);
    }
  }

  function handleLimitChange(event: ChangeEvent<HTMLSelectElement>) {
    setLimit(Number(event.target.value));
    setPage(1);
  }

  function goToPreviousPage() {
    setPage((currentValue) => Math.max(1, currentValue - 1));
  }

  function goToNextPage() {
    setPage((currentValue) => Math.min(totalPages, currentValue + 1));
  }

  if (adminSection === "MENU") {
    return (
      <div className="min-h-full bg-surface p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-on-surface">Administration</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Choisissez une section de gestion.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setAdminSection("USERS")}
            className="group rounded-[24px] border border-surface-high bg-white p-6 text-left shadow-[0_14px_40px_rgba(23,54,46,0.06)] transition hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <Users size={20} />
            </div>
            <h2 className="mt-6 text-lg font-bold text-on-surface">Gestion des utilisateurs</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Administrer les comptes, rôles, structures et mots de passe.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ouvrir <ArrowRight size={15} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAdminSection("OBLIGATIONS")}
            className="group rounded-[24px] border border-surface-high bg-white p-6 text-left shadow-[0_14px_40px_rgba(23,54,46,0.06)] transition hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <Shield size={20} />
            </div>
            <h2 className="mt-6 text-lg font-bold text-on-surface">Gestion des obligations</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Synchroniser, modifier et supprimer les obligations spécifiques.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ouvrir <ArrowRight size={15} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAdminSection("NFC")}
            className="group rounded-[24px] border border-surface-high bg-white p-6 text-left shadow-[0_14px_40px_rgba(23,54,46,0.06)] transition hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <RefreshCw size={20} />
            </div>
            <h2 className="mt-6 text-lg font-bold text-on-surface">Synchronisation NFC</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Récupérer les badges NFC depuis l'API des détenus et les associer aux bénéficiaires.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ouvrir <ArrowRight size={15} />
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (adminSection === "NFC") {
    return (
      <div className="min-h-full bg-surface p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setAdminSection("MENU")}
              className="mb-3 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              ← Retour à l'administration
            </button>
            <h1 className="text-xl font-bold text-on-surface">Synchronisation NFC</h1>
            <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
              Le système récupère les détenus, lit le NFC et l'associe au bénéficiaire via le numéro de mandat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSyncNfcBadges()}
            disabled={nfcSyncing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2e4d44] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nfcSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Synchroniser les NFC
          </button>
        </div>

        {nfcSyncError && (
          <div className="mb-4 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {nfcSyncError}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Détenus lus", nfcSyncResult?.fetched ?? 0],
            ["NFC trouvés", nfcSyncResult?.recordsWithNfc ?? 0],
            ["Bénéficiaires matchés", nfcSyncResult?.matched ?? 0],
            ["Mis à jour", nfcSyncResult?.updated ?? 0],
            ["Déjà à jour", nfcSyncResult?.unchanged ?? 0],
            ["Non trouvés SCBAP", nfcSyncResult?.missingInScbap ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white p-5">
              <p className="text-2xl font-bold text-on-surface">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                {label}
              </p>
            </div>
          ))}
        </div>

        {nfcSyncResult?.conflicts ? (
          <div className="mt-5 rounded-lg border border-error/20 bg-error/10 p-4">
            <p className="text-sm font-bold text-on-error-container">
              {nfcSyncResult.conflicts} conflit(s) détecté(s)
            </p>
            <div className="mt-3 space-y-2">
              {nfcSyncResult.issues.map((issue, index) => (
                <p key={`${issue.numeroMandat}-${index}`} className="text-xs text-on-error-container">
                  {issue.numeroMandat ?? "Mandat inconnu"} • {issue.nfc ?? "NFC inconnu"} : {issue.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (adminSection === "OBLIGATIONS") {
    return (
      <div className="min-h-full bg-surface p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setAdminSection("MENU")}
              className="mb-3 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              ← Retour à l'administration
            </button>
            <h1 className="text-xl font-bold text-on-surface">Gestion des obligations</h1>
          </div>
          <button
            type="button"
            onClick={() => void reloadObligationReferences(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2e4d44]"
          >
            <RefreshCw size={14} />
            Synchroniser DAPG
          </button>
        </div>
        {obligationsError && (
          <div className="mb-4 rounded-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {obligationsError}
          </div>
        )}
        {obligationsLoading ? (
          <div className="flex min-h-64 items-center justify-center text-on-surface-variant">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[140px_minmax(0,1fr)_180px_110px_150px] items-center gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#17362e] md:grid">
              <span>Code</span>
              <span>Libellé</span>
              <span>Catégorie</span>
              <span>Actif</span>
              <span className="text-right">Actions</span>
            </div>
            {obligationReferences.map((reference) => (
              <div key={reference.id} className="grid gap-3 rounded-lg border border-surface-high bg-white p-4 md:grid-cols-[140px_minmax(0,1fr)_180px_110px_150px] md:items-center">
                <input
                  title="Code de l'obligation"
                  value={reference.code}
                  onChange={(event) =>
                    setObligationReferences((current) =>
                      current.map((item) => item.id === reference.id ? { ...item, code: event.target.value } : item),
                    )
                  }
                  className="rounded-md bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  title="Libellé de l'obligation"
                  value={reference.libelle}
                  onChange={(event) =>
                    setObligationReferences((current) =>
                      current.map((item) => item.id === reference.id ? { ...item, libelle: event.target.value } : item),
                    )
                  }
                  className="rounded-md bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-on-surface-variant">{reference.categorie.nom}</span>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={reference.active}
                    onChange={(event) =>
                      setObligationReferences((current) =>
                        current.map((item) => item.id === reference.id ? { ...item, active: event.target.checked } : item),
                      )
                    }
                  />
                  Active
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateReference(reference)}
                    disabled={editingReferenceId === reference.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-[#2e4d44] disabled:opacity-60"
                    aria-label="Enregistrer"
                    title="Enregistrer"
                  >
                    <Save size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteReference(reference.id)}
                    disabled={editingReferenceId === reference.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-error-container text-on-error-container transition-colors hover:bg-error-container/80 disabled:opacity-60"
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
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
          <button
            type="button"
            onClick={() => setAdminSection("MENU")}
            className="mb-3 text-sm font-semibold text-on-surface-variant hover:text-primary"
          >
            ← Retour à l'administration
          </button>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <UserRoundCog size={20} className="text-primary" />
            Administration
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Gestion des comptes et des accès du système
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateUserDrawer}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2e4d44]"
          >
            <Plus size={14} />
            Nouvel utilisateur
          </button>
          <button
            type="button"
            onClick={reloadUsers}
            className="inline-flex items-center gap-2 rounded-md border border-surface-high bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-low"
          >
            <RefreshCw size={14} />
            Recharger
          </button>
        </div>
      </div>

      {(generatedPassword || error) && (
        <div className="mb-4 space-y-2">
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
        <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-md bg-surface-highest text-sm placeholder:text-outline-variant outline-none focus:border-b-2 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={loading || currentPage <= 1}
              aria-label="Page précédente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-24 text-center text-xs font-semibold text-on-surface-variant">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={loading || filteredUsers.length === 0 || currentPage >= totalPages}
              aria-label="Page suivante"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronRight size={16} />
            </button>
          </div>
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

      <div>
        <div>
          <div className="hidden sm:grid grid-cols-[40px_minmax(0,1.4fr)_170px_minmax(180px,0.8fr)_120px_96px] items-center gap-4 px-5 py-2 mb-2">
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
              {paginatedUsers.map((user) => {
                const isSelected = user.id === selectedId;

                return (
                  <div
                    key={user.id}
                    className={`rounded-lg border border-transparent transition-colors ${
                      isSelected ? "bg-[#eef8f4] hover:border-primary" : "hover:border-surface-high"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(user.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(user.id);
                        }
                      }}
                      className="w-full grid cursor-pointer grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1.4fr)_170px_minmax(180px,0.8fr)_120px_96px] items-center gap-4 rounded-lg bg-white px-5 py-4 text-left transition-colors hover:bg-surface"
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
                          className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-low text-[#2e4d44] transition-colors hover:bg-surface-high"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditUserDrawer(user);
                          }}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                          <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-md bg-[#17362e] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            Modifier
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleResetPassword(user.id);
                          }}
                          disabled={resettingId === user.id}
                          className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-[#2e4d44] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Réinitialiser le mot de passe"
                          title="Réinitialiser le mot de passe"
                        >
                          {resettingId === user.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <KeyRound size={14} />
                          )}
                          <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-md bg-[#17362e] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            Réinitialiser le mot de passe
                          </span>
                        </button>
                      </div>
                    </div>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Par page
                <select
                  value={limit}
                  onChange={handleLimitChange}
                  className="rounded-md bg-surface-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {getPageSizeOptions([10, 20, 50]).map((option) => (
                    <option key={option} value={option}>
                      {getPageSizeOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={loading || currentPage <= 1}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-low text-xs font-semibold text-on-surface-variant hover:bg-surface-high transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <div className="min-w-28 text-center text-sm font-medium text-on-surface">
                  Page {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={loading || filteredUsers.length === 0 || currentPage >= totalPages}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-xs font-semibold text-white hover:bg-[#2e4d44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* <aside className="space-y-4">
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
        </aside> */}
      </div>
    </div>

    <SideDrawer open={userCreateDrawerOpen} onClose={() => setUserCreateDrawerOpen(false)} showCloseButton>
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="pr-12">
          <span className="mb-3 inline-block rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#2e4d44]">
            {userDrawerMode === "CREATE" ? "Nouvel accès" : "Modification"}
          </span>
          <h2 className="text-[28px] font-extrabold leading-tight text-[#17362e]">
            {userDrawerMode === "CREATE" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
          </h2>
        </div>
        <form className="mt-8 space-y-4" onSubmit={userDrawerMode === "CREATE" ? handleCreateUser : handleSave}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
              Nom
              <input value={userDrawerMode === "CREATE" ? createForm.nom : form.nom} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, nom: event.target.value }) : setForm({ ...form, nom: event.target.value })} className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary" required />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
              Prénom
              <input value={userDrawerMode === "CREATE" ? createForm.prenom : form.prenom} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, prenom: event.target.value }) : setForm({ ...form, prenom: event.target.value })} className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary" required />
            </label>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Email
            <input type="email" value={userDrawerMode === "CREATE" ? createForm.email : form.email} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, email: event.target.value }) : setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary disabled:opacity-60" required disabled={userDrawerMode === "EDIT"} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Téléphone
            <input value={userDrawerMode === "CREATE" ? createForm.telephone : form.telephone} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, telephone: event.target.value }) : setForm({ ...form, telephone: event.target.value })} className="mt-2 w-full rounded-md bg-surface-highest px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary" />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
              Rôle
              <select value={userDrawerMode === "CREATE" ? createForm.roleId : form.roleId} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, roleId: event.target.value }) : setForm({ ...form, roleId: event.target.value })} className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary" required>
                <option value="">Sélectionner</option>
                {meta.roles.map((role) => <option key={role.id} value={role.id}>{role.nom}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
              Structure
              <select value={userDrawerMode === "CREATE" ? createForm.structureId : form.structureId} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, structureId: event.target.value }) : setForm({ ...form, structureId: event.target.value })} className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary" required>
                <option value="">Sélectionner</option>
                {meta.structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.nom}</option>)}
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Statut
            <select value={userDrawerMode === "CREATE" ? createForm.statut : form.statut} onChange={(event) => userDrawerMode === "CREATE" ? setCreateForm({ ...createForm, statut: event.target.value }) : setForm({ ...form, statut: event.target.value })} className="mt-2 w-full rounded-md bg-surface-low px-3 py-2 text-sm outline-none focus:border-b-2 focus:border-primary">
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
              <option value="SUSPENDU">SUSPENDU</option>
            </select>
          </label>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2e4d44] disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : userDrawerMode === "CREATE" ? <Plus size={15} /> : <Save size={15} />}
            {userDrawerMode === "CREATE" ? "Créer l'utilisateur" : "Enregistrer les modifications"}
          </button>
        </form>
      </div>
    </SideDrawer>
    </>
  );
}
