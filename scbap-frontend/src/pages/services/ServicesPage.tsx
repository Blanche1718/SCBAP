import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Cable,
  Loader2,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { Button, Card, Input, Select } from "../../components/ui/index";
import { SideDrawer } from "../../components/ui/SideDrawer";
import { useToast } from "../../context/ToastContext";
import { useServicesExternes } from "../../hooks/useServicesExternes";
import { api } from "../../lib/api";
import type {
  ApiResponse,
  ServiceExterne,
  ServiceExterneType,
} from "../../types";
import { SERVICE_EXTERNE_TYPE_LABELS } from "../../utils/services-externes";
import {
  getPageSizeOptionLabel,
  getPageSizeOptions,
} from "../../utils/pagination";
import { formatInAppTimeZone } from "../../utils/timezone";

type ServiceFormState = {
  nom: string;
  type: ServiceExterneType;
  email: string;
  telephone: string;
};

const DEFAULT_FORM: ServiceFormState = {
  nom: "",
  type: "MEDICAL",
  email: "",
  telephone: "",
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return formatInAppTimeZone(new Date(value), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(service: ServiceExterne) {
  return service.actif ? "Actif" : "Inactif";
}

function getStatusClassName(service: ServiceExterne) {
  return service.actif
    ? "bg-primary-fixed text-[#2e4d44]"
    : "bg-surface-high text-on-surface-variant";
}

export default function ServicesPage() {
  const { showToast } = useToast();
  const { services, loading, error, refetch } = useServicesExternes();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [typeFilter, setTypeFilter] = useState<"TOUS" | ServiceExterneType>("TOUS");
  const [form, setForm] = useState<ServiceFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceExterne | null>(null);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return services.filter((service) => {
      const haystack = [
        service.nom,
        service.email,
        service.telephone ?? "",
        SERVICE_EXTERNE_TYPE_LABELS[service.type],
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesType = query || typeFilter === "TOUS" || service.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [search, services, typeFilter]);

  const counts = useMemo(() => {
    const affectationsActives = services.reduce(
      (total, service) => total + service.stats.affectationsActives,
      0,
    );
    const evaluationsTotal = services.reduce(
      (total, service) => total + service.stats.evaluationsTotal,
      0,
    );

    return {
      total: services.length,
      actifs: services.filter((service) => service.actif).length,
      affectationsActives,
      evaluationsTotal,
    };
  }, [services]);

  const totalPages = Math.max(Math.ceil(filteredServices.length / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredServices.slice(start, start + limit);
  }, [currentPage, filteredServices, limit]);
  const pageStart = filteredServices.length === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd =
    filteredServices.length === 0 ? 0 : pageStart + paginatedServices.length - 1;

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreateDrawer() {
    setEditingService(null);
    setForm(DEFAULT_FORM);
    setDrawerOpen(true);
  }

  function openEditDrawer(service: ServiceExterne) {
    setEditingService(service);
    setForm({
      nom: service.nom,
      type: service.type,
      email: service.email,
      telephone: service.telephone ?? "",
    });
    setDrawerOpen(true);
  }

  async function handleSubmitService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        nom: form.nom.trim(),
        type: form.type,
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone.trim() || null,
      };

      if (editingService) {
        await api.put<ApiResponse<ServiceExterne>>(
          `/services-externes/${editingService.id}`,
          {
            ...payload,
            actif: editingService.actif,
          },
        );
        showToast("Service externe mis à jour avec succès.", "success");
      } else {
        await api.post<ApiResponse<unknown>>("/services-externes", payload);
        showToast("Service externe créé avec succès. Le code d'accès a été envoyé par email.", "success");
      }

      setForm(DEFAULT_FORM);
      setEditingService(null);
      setDrawerOpen(false);
      await refetch();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
  }

  return (
    <div className="min-h-full bg-surface p-4 sm:p-8">
      <div
        className="mb-8 grid grid-cols-1 gap-5 rounded-2xl px-6 py-6 text-white sm:grid-cols-2 xl:grid-cols-4"
        style={{ background: "linear-gradient(135deg, #17362e 0%, #2e4d44 62%, #4f7a6d 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14">
            <Building2 size={18} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-2xl font-bold">{counts.total}</p>
            <p className="text-xs font-medium text-white/72">Services enregistrés</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14">
            <Shield size={18} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-2xl font-bold">{counts.actifs}</p>
            <p className="text-xs font-medium text-white/72">Services actifs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14">
            <Users size={18} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-2xl font-bold">{counts.affectationsActives}</p>
            <p className="text-xs font-medium text-white/72">Affectations actives</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14">
            <Cable size={18} className="text-primary-fixed" />
          </div>
          <div>
            <p className="text-2xl font-bold">{counts.evaluationsTotal}</p>
            <p className="text-xs font-medium text-white/72">Évaluations reçues</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden border border-surface-high p-0 shadow-sm">
          <div className="border-b border-surface-high px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-bold text-on-surface">Services externes</h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Sélectionne un service pour voir les bénéficiaires affectés et ajouter un nouveau suivi.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start lg:self-auto">
                <CompactPaginationControls
                  page={currentPage}
                  totalPages={totalPages}
                  loading={loading}
                  onPrevious={goToPreviousPage}
                  onNext={goToNextPage}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateDrawer}
                >
                  <Plus size={14} />
                  Ajouter un service
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="border border-surface-high bg-white"
                  onClick={() => void refetch()}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Actualiser
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_120px]">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un service, un email, un téléphone..."
                  className="h-11 w-full rounded-lg border border-surface-high bg-surface-highest pl-9 pr-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "TOUS" | ServiceExterneType)
                }
                className="h-11 rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
              >
                <option value="TOUS">Tous les types</option>
                {Object.entries(SERVICE_EXTERNE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-lg border border-surface-high bg-surface-highest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
              >
                {getPageSizeOptions([8, 12, 20]).map((value) => (
                  <option key={value} value={value}>
                    {getPageSizeOptionLabel(value)} / page
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="m-5 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-on-error-container">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {filteredServices.length === 0
              ? "Aucun service"
              : `${pageStart}-${pageEnd} sur ${filteredServices.length} service(s)`}
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center text-on-surface-variant">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : paginatedServices.length === 0 ? (
            <div className="px-5 pb-8">
              <div className="rounded-2xl border border-dashed border-surface-high bg-surface-low px-6 py-12 text-center">
                <Building2 size={22} className="mx-auto text-outline-variant" />
                <p className="mt-4 text-sm font-semibold text-on-surface">
                  Aucun service externe ne correspond à tes filtres.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-5 pb-5">
              {paginatedServices.map((service) => (
                <div
                  key={service.id}
                  className="group rounded-2xl border border-surface-high bg-white p-4 transition-all hover:border-primary/30 hover:bg-surface-low"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <Link to={`/services/${service.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-on-error-container truncate">
                          {service.nom}
                        </h2>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(service)}`}
                        >
                          {getStatusLabel(service)}
                        </span>
                        <span className="inline-flex rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                          {SERVICE_EXTERNE_TYPE_LABELS[service.type]}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 text-sm text-on-surface-variant sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <span>{service.email}</span>
                        <span className="inline-flex items-center gap-2">
                          <Phone size={14} />
                          {service.telephone || "Téléphone non renseigné"}
                        </span>
                      </div>
                    </Link>

                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-low px-4 py-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-on-surface">
                          {service.stats.affectationsActives}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">Actives</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-on-surface">
                          {service.stats.affectationsTotal}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">Affectations</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-on-surface">
                          {service.stats.evaluationsTotal}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">Évaluations</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-surface-high pt-3 text-xs text-on-surface-variant">
                    <span>Créé le {formatDateTime(service.createdAt)}</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(service)}
                        className="inline-flex items-center gap-2 rounded-lg border border-surface-high bg-white px-3 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-high"
                      >
                        <Pencil size={14} />
                        Modifier
                      </button>
                      <Link
                        to={`/services/${service.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 font-semibold text-white transition-colors hover:bg-[#2e4d44]"
                      >
                        Ouvrir le service
                        <ArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        showCloseButton
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="pr-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              {editingService ? "Modification" : "Création"}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#17362e]">
              {editingService ? "Modifier le service" : "Ajouter un service"}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {editingService
                ? "Mettez à jour les coordonnées et le type du service partenaire."
                : "Créez le service partenaire avant de lui affecter des bénéficiaires."}
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmitService}>
            <Input
              label="Nom du service"
              value={form.nom}
              onChange={(event) =>
                setForm((current) => ({ ...current, nom: event.target.value }))
              }
              placeholder="Ex: Centre médical Saint Luc"
              required
            />

            <Select
              label="Type de service"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as ServiceExterneType,
                }))
              }
              options={Object.entries(SERVICE_EXTERNE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <Input
              label="Adresse email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="service@partenaire.bj"
              required
            />

            <Input
              label="Téléphone"
              value={form.telephone}
              onChange={(event) =>
                setForm((current) => ({ ...current, telephone: event.target.value }))
              }
              placeholder="Optionnel"
            />

            <Button type="submit" className="w-full" loading={saving}>
              {editingService ? "Enregistrer les modifications" : "Créer le service"}
            </Button>
          </form>
        </div>
      </SideDrawer>
    </div>
  );
}
