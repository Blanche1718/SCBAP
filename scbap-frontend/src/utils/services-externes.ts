import type { ServiceExterneType } from "../types";

export const SERVICE_EXTERNE_TYPE_LABELS: Record<ServiceExterneType, string> = {
  MEDICAL: "Médical",
  EMPLOI: "Emploi",
  FORMATION: "Formation",
  SOCIAL: "Social",
  AUTRE: "Autre",
};

export const AFFECTATION_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ACTIVE: "Active",
  SUSPENDUE: "Suspendue",
  TERMINEE: "Terminée",
};

export function formatHorairesAttendus(value: unknown) {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    const textValue = (value as Record<string, unknown>).texte;
    if (typeof textValue === "string" && textValue.trim()) {
      return textValue;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }

  return String(value);
}
