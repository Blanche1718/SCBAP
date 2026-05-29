type DapgDossierLike = {
  obligations?: string | null;
  othersData?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeText(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function extractTexts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(asRecord(item)?.texte))
    .filter((item): item is string => Boolean(item));
}

export function getDapgRawObligationsText(dossier?: DapgDossierLike | null) {
  const storedText = normalizeText(dossier?.obligations);
  if (storedText) return storedText;

  const othersData = asRecord(dossier?.othersData);
  const raw = asRecord(othersData?.raw);
  const texts = [
    ...extractTexts(raw?.obligations_specifiques),
    ...extractTexts(othersData?.obligationsSpecifiques),
  ];

  return texts.length ? texts.join("\n") : null;
}
