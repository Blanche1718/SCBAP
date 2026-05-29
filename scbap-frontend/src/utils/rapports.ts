export const CONFORMITE_LABELS: Record<string, string> = {
  SATISFAISANT: "Satisfaisant",
  A_SURVEILLER: "À surveiller",
  PREOCCUPANT: "Préoccupant",
};

export const CONFORMITE_TONES: Record<string, string> = {
  SATISFAISANT: "bg-primary-fixed text-[#2e4d44]",
  A_SURVEILLER: "bg-[#fff3e0] text-[#e65100]",
  PREOCCUPANT: "bg-[#ffcccc] text-[#b71c1c]",
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  MENSUEL: "Mensuel",
  URGENCE: "Urgence",
  VISITE: "Visite",
  EVALUATION: "Évaluation",
  GENERAL: "Général",
};

export const FREQUENCE_SUIVI_LABELS: Record<string, string> = {
  QUOTIDIEN: "Quotidien",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL: "Mensuel",
};

export const DOCUMENT_SOURCE_LABELS: Record<string, string> = {
  DAPG: "DAPG",
  MANUAL: "Téléversé",
  SCBAP: "SCBAP",
};

export function getReportTypeLabel(value: string) {
  return REPORT_TYPE_LABELS[value] || value;
}

export function getFrequenceSuiviLabel(value: string) {
  return FREQUENCE_SUIVI_LABELS[value] || value;
}

export function getConformiteLabel(value: string) {
  return CONFORMITE_LABELS[value] || value;
}

export function getConformiteTone(value: string) {
  return CONFORMITE_TONES[value] || "bg-surface-high text-on-surface-variant";
}

export function getDocumentSourceLabel(value: string) {
  return DOCUMENT_SOURCE_LABELS[value] || value;
}
