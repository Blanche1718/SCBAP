type ExtractedObligation = {
  description: string;
  categorieNom: string;
  type?: string;
  frequence?: string;
  jour_semaine?: string;
  heure?: string;
  lieu?: string;
  metadata?: Record<string, unknown>;
};

const DAY_MAP: Record<string, string> = {
  lundi: "LUNDI",
  mardi: "MARDI",
  mercredi: "MERCREDI",
  jeudi: "JEUDI",
  vendredi: "VENDREDI",
  samedi: "SAMEDI",
  dimanche: "DIMANCHE",
};

const CATEGORY_RULES = [
  {
    match: /domiciliation|domicile|visites domiciliaires|hebergement/i,
    categorieNom: "DOMICILIATION",
    type: "DOMICILIATION",
  },
  {
    match: /pointer|pointage|registre|signature|entretien|contact telephonique/i,
    categorieNom: "POINTAGE",
    type: "POINTAGE",
  },
  {
    match: /respect des lois|ordre public|infraction/i,
    categorieNom: "CONDUITE",
    type: "CONDUITE",
  },
  {
    match: /activite professionnelle|emploi|formation professionnelle|bulletins de paie/i,
    categorieNom: "INSERTION_PRO",
    type: "INSERTION_PRO",
  },
  {
    match: /spip|reinsertion|psychologique|medical|addictions|traitement/i,
    categorieNom: "SUIVI_SOCIAL_MEDICAL",
    type: "SUIVI_SOCIAL_MEDICAL",
  },
  {
    match: /victimes?|perimetre d'interdiction|approcher le domicile/i,
    categorieNom: "RELATIONS_VICTIMES",
    type: "RELATIONS_VICTIMES",
  },
  {
    match: /alcool|stup[eé]fiants|depistage|sevrage|addictologique/i,
    categorieNom: "SUBSTANCES",
    type: "SUBSTANCES",
  },
  {
    match: /travaux d'interet general|bracelet electronique|assistant social|reparation pecuniaire/i,
    categorieNom: "OBLIGATIONS_COMPLEMENTAIRES",
    type: "OBLIGATIONS_COMPLEMENTAIRES",
  },
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function extractTime(text: string) {
  const match = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return undefined;
  const hours = pad2(Number(match[1]));
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

function extractDay(text: string) {
  const match = text.match(
    /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i,
  );
  if (!match) return undefined;
  return DAY_MAP[match[1].toLowerCase()];
}

function extractLieu(text: string) {
  if (/commissariat/i.test(text)) {
    const match = text.match(/commissariat[^.]+/i);
    return match ? match[0].trim() : "Commissariat";
  }
  if (/domicile/i.test(text)) return "Domicile";
  return undefined;
}

function extractFrequence(text: string) {
  if (/quotidien|tous les jours|journali/i.test(text)) return "QUOTIDIEN";
  if (/hebdomadaire|une fois par semaine|par semaine/i.test(text)) return "HEBDOMADAIRE";
  if (/bimensuel|deux fois par mois/i.test(text)) return "BIMENSUEL";
  if (/mensuel|par mois/i.test(text)) return "MENSUEL";
  if (/deux fois par semaine|renforce/i.test(text)) return "BIHEBDOMADAIRE";
  return undefined;
}

function isSectionHeader(line: string) {
  return /^section\s+[ivxlcdm]+\s+—/i.test(line);
}

function extractNumberedItem(line: string) {
  const match = line.match(/^(\d+)\s+—\s+(.*)$/);
  if (!match) return null;
  return {
    index: Number(match[1]),
    description: match[2].trim(),
  };
}

export function extractObligationsFromText(raw?: string | null) {
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: ExtractedObligation[] = [];

  for (const line of lines) {
    if (isSectionHeader(line)) continue;

    const item = extractNumberedItem(line);
    const description = item ? item.description : line;
    const rule = CATEGORY_RULES.find((r) => r.match.test(description));

    results.push({
      description,
      categorieNom: rule?.categorieNom ?? "OBLIGATIONS_COMPLEMENTAIRES",
      type: rule?.type,
      frequence: extractFrequence(description),
      jour_semaine: extractDay(description),
      heure: extractTime(description),
      lieu: extractLieu(description),
      metadata: {
        source: "raw_text",
        index: item?.index,
      },
    });
  }

  return results;
}
