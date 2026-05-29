import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import type { Notification } from "../../types";
import {
  formatNotificationAgo,
  formatNotificationDate,
  getNotificationBadge,
  getNotificationEntityLabel,
  getNotificationTitle,
  getNotificationTone,
  resolveNotificationTarget,
} from "../../utils/notifications";

type Props = {
  notification: Notification;
  compact?: boolean;
  onOpen?: (notification: Notification) => void;
};

export function NotificationItem({ notification, compact = false, onOpen }: Props) {
  const tone = getNotificationTone(notification);
  const title = getNotificationTitle(notification);
  const entityLabel = getNotificationEntityLabel(notification);
  const to = resolveNotificationTarget(notification);

  return (
    <Link
      to={to}
      onClick={() => onOpen?.(notification)}
      className={`group block rounded-xl bg-white p-4 shadow-[0_10px_30px_rgba(23,54,46,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(23,54,46,0.08)] ${tone.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.chip}`}>
          <span className="text-[10px] font-black tracking-[0.25em]">{getNotificationBadge(notification)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#17362e]">{title}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f4f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#414845]">
              {notification.targetType}
            </span>
            {!notification.lu ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ffdad6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93000a]">
                <CircleAlert size={10} />
                Non lue
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#d3e3de] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#576662]">
                <CheckCircle2 size={10} />
                Lue
              </span>
            )}
          </div>
          <p className={`mt-1 text-[#414845] ${compact ? "text-xs leading-snug" : "text-sm leading-relaxed"}`}>
            {notification.message}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#191c1c]">{entityLabel}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#414845]">
                {formatNotificationDate(notification)}
                <span className="mx-1">•</span>
                {formatNotificationAgo(notification)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17362e] group-hover:translate-x-0.5 transition-transform">
              Ouvrir
              <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
