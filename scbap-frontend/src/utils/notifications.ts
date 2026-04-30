import type { Notification } from "../types";
import { formatInAppTimeZone, normalizePointageDateValue } from "./timezone";

function getMetadataEventAt(notification: Notification) {
  const value = notification.metadata?.eventAt;
  return typeof value === "string" ? value : null;
}

function isPointageNotification(notification: Notification) {
  return (
    notification.targetType === "POINTAGE" ||
    notification.type === "POINTAGE_ANOMALIE" ||
    notification.type === "POINTAGE_ABSENT" ||
    notification.type === "ABSENCE_POINTAGE"
  );
}

function getNotificationRawTime(notification: Notification) {
  return getMetadataEventAt(notification) ?? notification.dateEnvoi ?? notification.createdAt;
}

function getNotificationDateValue(notification: Notification) {
  const rawValue = getNotificationRawTime(notification);
  if (!rawValue) {
    return null;
  }

  return isPointageNotification(notification)
    ? normalizePointageDateValue(rawValue)
    : new Date(rawValue);
}

export function formatNotificationDate(notification: Notification) {
  const parsed = getNotificationDateValue(notification);
  if (!parsed || Number.isNaN(parsed.getTime())) return "—";
  return formatInAppTimeZone(parsed, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNotificationSortTime(notification: Notification) {
  const parsed = getNotificationDateValue(notification);
  return !parsed || Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function formatNotificationAgo(notification: Notification) {
  const parsed = getNotificationDateValue(notification);
  const timestamp = parsed?.getTime() ?? Number.NaN;
  if (Number.isNaN(timestamp)) return "—";
  const diff = Date.now() - timestamp;
  if (diff < 0) return "à l'instant";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return seconds === 0 ? "à l'instant" : `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function getNotificationTone(notification: Notification) {
  if (notification.priorite === "CRITIQUE") {
    return {
      chip: "bg-error-container text-on-error-container",
      marker: "bg-on-error-container",
      border: "border-l-4 border-l-on-error-container",
    };
  }

  if (notification.priorite === "NORMALE") {
    return {
      chip: "bg-[#ffe9c7] text-[#6b3d00]",
      marker: "bg-[#f59e0b]",
      border: "border-l-4 border-l-[#f59e0b]",
    };
  }

  return {
    chip: "bg-primary-fixed text-[#2e4d44]",
    marker: "bg-primary",
    border: "border-l-4 border-l-primary",
  };
}

export function getNotificationBadge(notification: Notification) {
  const normalized = notification.type.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return (normalized.slice(0, 2) || "NO").padEnd(2, "N");
}

export function getNotificationTitle(notification: Notification) {
  switch (notification.type) {
    case "SORTIE_ZONE":
      return "Sortie de zone";
    case "RETRAIT_BRACELET":
      return "Retrait du bracelet";
    case "BATTERIE_FAIBLE":
      return "Batterie faible";
    case "POWER_FAIL":
      return "Coupure d'alimentation";
    case "BIOMETRIE_CONFIGUREE":
      return "Biométrie configurée";
    case "NOUVEAU_BENEFICIAIRE":
      return "Nouveau bénéficiaire";
    case "POINTAGE_ANOMALIE":
      return "Pointage anomalie";
    case "POINTAGE_ABSENT":
      return "Pointage absent";
    default:
      return notification.type.replace(/_/g, " ");
  }
}

export function resolveNotificationTarget(notification: Notification) {
  if (notification.targetType === "ALERTE") {
    return `/alertes?alerte=${encodeURIComponent(notification.targetId)}`;
  }

  if (notification.targetType === "POINTAGE") {
    return `/pointages/${encodeURIComponent(notification.targetId)}`;
  }

  if (notification.targetType === "BENEFICIAIRE" || notification.targetType === "BIOMETRIE") {
    return `/beneficiaires/${encodeURIComponent(notification.targetId)}`;
  }

  return "/notifications";
}

export function getNotificationEntityLabel(notification: Notification) {
  if (notification.pointage?.beneficiaire?.dossier) {
    const dossier = notification.pointage.beneficiaire.dossier;
    return `${dossier.prenom} ${dossier.nom}`.trim();
  }

  if (notification.beneficiaire?.dossier) {
    const dossier = notification.beneficiaire.dossier;
    return `${dossier.prenom} ${dossier.nom}`.trim();
  }

  if (notification.alerte?.message) {
    return notification.alerte.message;
  }

  return notification.targetType;
}
