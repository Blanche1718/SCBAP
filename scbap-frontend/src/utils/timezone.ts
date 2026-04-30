const DEFAULT_APP_TIME_ZONE = "Africa/Porto-Novo";
const POINTAGE_DISPLAY_SHIFT_MS = 60 * 60 * 1000;

function resolveAppTimeZone() {
  const configuredTimeZone = import.meta.env.VITE_APP_TIME_ZONE?.trim();
  return configuredTimeZone || DEFAULT_APP_TIME_ZONE;
}

export const APP_TIME_ZONE = resolveAppTimeZone();

function parseDateValue(value: Date | string | number) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizePointageDateValue(value: Date | string | number) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return null;
  }

  // Pointage-related timestamps currently arrive one hour ahead of the
  // correctly rendered alert/surveillance feeds. We normalize them here so
  // the affected pages reuse the same final formatter and visible hour model.
  return new Date(parsed.getTime() - POINTAGE_DISPLAY_SHIFT_MS);
}

export function formatInAppTimeZone(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
) {
  const formattedValue = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(formattedValue);
}

export function formatPointageInAppTimeZone(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
) {
  const normalizedValue = normalizePointageDateValue(value);
  if (!normalizedValue) {
    return "—";
  }

  return formatInAppTimeZone(normalizedValue, options);
}
