import { checkAndCreateAbsentPointages } from "../services/pointage.service";
import {
  APP_TIME_ZONE,
  buildDateInAppTimeZone,
  formatInAppTimeZone,
  getAppLocalDayKey,
  getTimeZoneDateParts,
} from "../utils/timezone";

const ABSENCE_CHECK_HOUR = 23;
const ABSENCE_CHECK_MINUTE = 50;

let scheduledTimer: NodeJS.Timeout | null = null;
let lastCheckedDayKey: string | null = null;
let running = false;

function getScheduledTimeForToday(now = new Date()) {
  const parts = getTimeZoneDateParts(now);
  return buildDateInAppTimeZone({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: ABSENCE_CHECK_HOUR,
    minute: ABSENCE_CHECK_MINUTE,
    second: 0,
  });
}

function getDelayUntilNextRun(now = new Date()) {
  const scheduledToday = getScheduledTimeForToday(now);

  if (now <= scheduledToday) {
    return scheduledToday.getTime() - now.getTime();
  }

  const tomorrow = new Date(scheduledToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

function clearScheduledTimer() {
  if (scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

async function runAbsenceCheck() {
  const dayKey = getAppLocalDayKey();

  if (lastCheckedDayKey === dayKey) {
    console.log(`[ABSENCE_CHECK_JOB] Skip for ${dayKey} (already processed)`);
    return;
  }

  if (running) {
    console.log("[ABSENCE_CHECK_JOB] Skip because a run is already in progress");
    return;
  }

  running = true;
  try {
    console.log(`[ABSENCE_CHECK_JOB] Starting absence check for ${dayKey}...`);
    const absences = await checkAndCreateAbsentPointages();
    console.log(
      `[ABSENCE_CHECK_JOB] Completed for ${dayKey}. Found ${absences.length} absence(s).`,
    );
    lastCheckedDayKey = dayKey;
  } catch (error) {
    console.error(`[ABSENCE_CHECK_JOB] Error checking absences for ${dayKey}:`, error);
  } finally {
    running = false;
  }
}

function scheduleNextRun() {
  clearScheduledTimer();

  const delayMs = getDelayUntilNextRun();
  const nextRun = new Date(Date.now() + delayMs);
  console.log(
    `[ABSENCE_CHECK_JOB] Next run scheduled at ${formatInAppTimeZone(nextRun, {
      dateStyle: "short",
      timeStyle: "short",
    })}`,
  );

  scheduledTimer = setTimeout(async () => {
    await runAbsenceCheck();
    scheduleNextRun();
  }, delayMs);
}

export function initializeAbsenceCheckJob() {
  console.log(
    `[ABSENCE_CHECK_JOB] Initializing daily absence check job at ${String(ABSENCE_CHECK_HOUR).padStart(2, "0")}:${String(ABSENCE_CHECK_MINUTE).padStart(2, "0")} (${APP_TIME_ZONE})...`,
  );

  const now = new Date();
  const scheduledToday = getScheduledTimeForToday(now);

  if (now >= scheduledToday) {
    void (async () => {
      await runAbsenceCheck();
      scheduleNextRun();
    })();
    return;
  }

  scheduleNextRun();
}

export function stopAbsenceCheckJob() {
  clearScheduledTimer();
  lastCheckedDayKey = null;
  running = false;
}
