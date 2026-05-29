import { Link } from "react-router-dom";
import { Bell, ChevronRight, X, RefreshCw } from "lucide-react";
import type { Notification } from "../../types";
import { NotificationItem } from "./NotificationItem";
import { getNotificationSortTime } from "../../utils/notifications";

type Props = {
  open: boolean;
  notifications: Notification[];
  unreadCount: number;
  loading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenNotification?: (notification: Notification) => void;
};

export function NotificationsDrawer({
  open,
  notifications,
  unreadCount,
  loading = false,
  onClose,
  onRefresh,
  onOpenNotification,
}: Props) {
  const sortedNotifications = [...notifications].sort(
    (left, right) => getNotificationSortTime(right) - getNotificationSortTime(left),
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[430px] bg-[#f8faf9] shadow-[0_24px_48px_rgba(23,54,46,0.18)] transition-transform duration-300 ease-in-out will-change-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ffdad6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#93000a]">
                <Bell size={12} />
                Notifications
              </div>
              <h2 className="font-[Manrope] text-2xl font-extrabold text-[#17362e]">Dernières notifications</h2>
              <p className="mt-1 text-sm font-medium text-[#414845]">
                {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#f2f4f3] p-2 text-[#17362e] transition-colors hover:bg-[#e6e9e8]"
              aria-label="Fermer les notifications"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#414845]">
            <span>{notifications.length} élément{notifications.length > 1 ? "s" : ""} récent{notifications.length > 1 ? "s" : ""}</span>
            {onRefresh ? (
              <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 text-[#17362e]">
                <RefreshCw size={12} />
                Actualiser
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-xl bg-white px-4 py-10 text-center text-sm font-medium text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
                  Chargement des notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-10 text-center text-sm font-medium text-[#414845] shadow-[0_10px_30px_rgba(23,54,46,0.05)]">
                  Aucune notification disponible.
                </div>
              ) : (
                sortedNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    compact
                    onOpen={onOpenNotification}
                  />
                ))
              )}
            </div>
          </div>

          <div className="bg-white px-5 py-4 shadow-[0_-10px_30px_rgba(23,54,46,0.05)]">
            <Link
              to="/notifications"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl bg-[#17362e] px-4 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <span>Voir toutes les notifications</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
