function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeJuridictionCode(value?: string | number | null) {
  if (value === undefined || value === null) {
    return "";
  }

  return stripAccents(String(value).trim())
    .toUpperCase()
    .replace(/['’]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getUserJuridictionCode(value?: string | null) {
  const code = normalizeJuridictionCode(value);
  return code || null;
}
