import { generateMonthlyDraftRapportsForActiveBeneficiaires } from "../services/rapport.service";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let lastRunKey: string | null = null;

function isLastDayOfMonth(date: Date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getDate() === 1;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function runIfNeeded() {
  const now = new Date();
  const key = monthKey(now);

  if (!isLastDayOfMonth(now) || lastRunKey === key) {
    return;
  }

  lastRunKey = key;
  try {
    const result = await generateMonthlyDraftRapportsForActiveBeneficiaires(now);
    console.log(
      `Rapports mensuels: ${result.generated} genere(s), ${result.skipped} ignore(s)`,
    );
  } catch (error) {
    lastRunKey = null;
    console.error("Erreur generation automatique rapports mensuels:", error);
  }
}

export function initializeMonthlyRapportJob() {
  void runIfNeeded();
  setInterval(() => {
    void runIfNeeded();
  }, CHECK_INTERVAL_MS);
}
