const DEFAULT_APP_TIME_ZONE = "Africa/Porto-Novo";

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
  return parseDateValue(value);
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
