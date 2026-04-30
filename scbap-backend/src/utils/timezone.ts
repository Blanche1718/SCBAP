export const APP_TIME_ZONE = process.env.APP_TIME_ZONE?.trim() || "UTC";

type TimeZoneDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function getTimeZoneDateParts(date = new Date(), timeZone = APP_TIME_ZONE): TimeZoneDateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = getTimeZoneDateParts(date, timeZone);
  const utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcTime - date.getTime();
}

export function buildDateInAppTimeZone(parts: TimeZoneDateParts) {
  let timestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  for (let index = 0; index < 2; index += 1) {
    const guess = new Date(timestamp);
    timestamp -= getTimeZoneOffsetMs(guess, APP_TIME_ZONE);
  }

  return new Date(timestamp);
}

export function getStartOfAppDay(date = new Date()) {
  const parts = getTimeZoneDateParts(date, APP_TIME_ZONE);
  return buildDateInAppTimeZone({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0,
  });
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

export function getAppLocalDayKey(date = new Date()) {
  const parts = getTimeZoneDateParts(date, APP_TIME_ZONE);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
