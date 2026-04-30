import { type ChangeEvent, type ElementType, useMemo, useState } from "react";
import { CompactPaginationControls } from "../../components/pagination/CompactPaginationControls";
import { NotificationItem } from "../../components/notifications/NotificationItem";
import { useNotifications } from "../../hooks/useNotifications";
import type { Notification } from "../../types";
import { Bell, CheckCheck, Filter, RefreshCw, Search, Users, AlertTriangle, Eye } from "lucide-react";
import { getPageSizeOptionLabel, getPageSizeOptions } from "../../utils/pagination";
import { getNotificationSortTime } from "../../utils/notifications";

const NOTIFICATION_TYPES = [
  { value: "", label: "Tous les types" },
  { value: "SORTIE_ZONE", label: "Sortie de zone" },
  { value: "RETRAIT_BRACELET", label: "Retrait du bracelet" },
  { value: "BATTERIE_FAIBLE", label: "Batterie faible" },
  { value: "POWER_FAIL", label: "Coupure d'alimentation" },
  { value: "NOUVEAU_BENEFICIAIRE", label: "Nouveau bénéficiaire" },
  { value: "BIOMETRIE_CONFIGUREE", label: "Biométrie configurée" },
  { value: "POINTAGE_ANOMALIE", label: "Pointage anomalie" },
  { value: "POINTAGE_ABSENT", label: "Pointage absent" },
];

function NotificationStatsCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: ElementType;
  tone?: "default" | "alert" | "success";
}) {
  const toneClasses = {
    default: "bg-[#f2f4f3] text-[#17362e]",
    alert: "bg-[#ffdad6] text-[#93000a]",
    success: "bg-[#d3e3de] text-[#2e4d44]",
  }[tone];

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#414845]">{label}</p>
          <p className="font-[Manrope] text-[32px] font-black leading-none text-[#191c1c]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [priorite, setPriorite] = useState("");
  const [lu, setLu] = useState<"TOUS" | "LUS" | "NON_LUS">("TOUS");

  const filters = useMemo(
    () => ({
      search,
      type,
      priorite,
      lu,
    }),
    [lu, priorite, search, type],
  );

  const { notifications, meta, loading, error, refetch, markAllAsRead, markAsRead } = useNotifications(
    page,
    limit,
    filters,
  );

  const totalPages = meta.totalPages || 1;
  const summary = meta.summary;
  const sortedNotifications = [...notifications].sort(
    (left, right) => getNotificationSortTime(right) - getNotificationSortTime(left),
  );

  const pageStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const pageEnd = meta.total === 0 ? 0 : pageStart + notifications.length - 1;

  async function handleMarkAllAsRead() {
    await markAllAsRead();
  }

  function goToPreviousPage() {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }

  function goToNextPage() {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  }

  function handleLimitChange(event: ChangeEvent<HTMLSelectElement>) {
    setLimit(Number(event.target.value));
    setPage(1);
  }

  function handleFilterChange(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  function handleOpenNotification(notification: Notification) {
    if (!notification.lu) {
      void markAsRead(notification.id);
    }
  }

  return (
    <div className="min-h-full bg-[#f8faf9] px-3 py-3 text-[#191c1c] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ffdad6] px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#93000a]">
                <Bell size={12} />
                Notifications système
              </div>
              <h1 className="font-[Manrope] text-[32px] font-extrabold leading-tight text-[#17362e] sm:text-[42px]">
                Notifications
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-medium text-[#414845]">
                Retrouvez ici tous les événements métier importants, avec accès direct vers les alertes, bénéficiaires et pointages concernés.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-md bg-[#f2f4f3] px-4 py-2 text-sm font-bold text-[#17362e] transition-colors hover:bg-[#e6e9e8]"
              >
                <RefreshCw size={14} />
                Actualiser
              </button>
              <button
                type="button"
                onClick={() => void handleMarkAllAsRead()}
                className="inline-flex items-center gap-2 rounded-md bg-[#17362e] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2e4d44]"
              >
                <CheckCheck size={14} />
                Tout marquer comme lu
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <NotificationStatsCard label="Total" value={summary.total} icon={Eye} />
          <NotificationStatsCard label="Non lues" value={summary.unread} icon={Bell} tone="alert" />
          <NotificationStatsCard label="Critiques" value={summary.critiques} icon={AlertTriangle} tone="alert" />
          <NotificationStatsCard label="Informatives" value={summary.infos} icon={Users} tone="success" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-lg">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717975]" />
              <input
                type="text"
                placeholder="Rechercher une notification..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-sm bg-[#e1e3e2] py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-b-2 focus:border-[#17362e]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-md bg-[#f2f4f3] px-3 py-2 text-sm text-[#414845]">
                <Filter size={14} />
                <select
                  value={type}
                  onChange={handleFilterChange(setType)}
                  className="bg-transparent text-sm font-medium text-[#191c1c] outline-none"
                >
                  {NOTIFICATION_TYPES.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-2 rounded-md bg-[#f2f4f3] px-3 py-2 text-sm text-[#414845]">
                <Filter size={14} />
                <select
                  value={priorite}
                  onChange={handleFilterChange(setPriorite)}
                  className="bg-transparent text-sm font-medium text-[#191c1c] outline-none"
                >
                  <option value="">Toutes priorités</option>
                  <option value="CRITIQUE">Critique</option>
                  <option value="NORMALE">Normale</option>
                  <option value="INFO">Info</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-2 rounded-md bg-[#f2f4f3] px-3 py-2 text-sm text-[#414845]">
                <Filter size={14} />
                <select
                  value={lu}
                  onChange={(event) => {
                    setLu(event.target.value as "TOUS" | "LUS" | "NON_LUS");
                    setPage(1);
                  }}
                  className="bg-transparent text-sm font-medium text-[#191c1c] outline-none"
                >
                  <option value="TOUS">Toutes</option>
                  <option value="NON_LUS">Non lues</option>
                  <option value="LUS">Lues</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-2 rounded-md bg-[#f2f4f3] px-3 py-2 text-sm text-[#414845]">
                {/* <span className="text-[10px] font-black uppercase tracking-[0.22em]">Lignes</span> */}
                <select
                  value={limit}
                  onChange={handleLimitChange}
                  className="bg-transparent text-sm font-medium text-[#191c1c] outline-none"
                >
                  {getPageSizeOptions([5, 10, 20, 50]).map((option) => (
                    <option key={option} value={option}>
                      {getPageSizeOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <CompactPaginationControls
                page={page}
                totalPages={meta.totalPages}
                loading={loading}
                onPrevious={goToPreviousPage}
                onNext={goToNextPage}
                buttonClassName="h-10 w-10 rounded-md bg-[#f2f4f3] text-[#17362e] hover:bg-[#e6e9e8] disabled:cursor-not-allowed disabled:opacity-50"
                labelClassName="min-w-[92px] text-center text-xs font-semibold text-[#414845]"
              />
            </div>
          </div>

          {/* <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#414845]">
            <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary.unread} non lue(s)</span>
            <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary.critiques} critique(s)</span>
            <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary.normales} normale(s)</span>
            <span className="rounded-full bg-[#f2f4f3] px-3 py-2">{summary.infos} info(s)</span>
          </div> */}
        </div>

        <div className="rounded-2xl bg-[#f2f4f3] p-3 sm:p-4">
          {loading && (
            <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
              Chargement des notifications...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-[#93000a] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
              {error}
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
              Aucune notification ne correspond aux filtres actuels.
            </div>
          )}

          {!loading && !error && sortedNotifications.length > 0 && (
            <div className="space-y-3">
              {sortedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpenNotification}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm font-medium text-[#414845]">
            {meta.total === 0
              ? "Aucune notification"
              : `Affichage de ${pageStart} à ${pageEnd} sur ${meta.total} notification(s)`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={page <= 1}
              className="rounded-md bg-[#f2f4f3] px-4 py-2 text-sm font-bold text-[#17362e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="rounded-md bg-[#e6e9e8] px-4 py-2 text-sm font-bold text-[#17362e]">
              Page {meta.page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={page >= totalPages}
              className="rounded-md bg-[#17362e] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
