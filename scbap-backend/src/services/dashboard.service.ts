import prisma from "../prisma";

export interface StatutGlobal {
  totalActifs: number;
  nonConformes: number;
  termines: number;
  alertesCritiques: number;
  rapportsEnAttente: number;
  variationActifs: number;
}

export interface EvenementTempsReel {
  id: string;
  beneficiaireCode: string;
  beneficiaireNom: string;
  message: string;
  heure: string;
  priorite: "CRITIQUE" | "MAINTENANCE" | "INFO";
}

export interface PointCompliance {
  jour: string;
  taux: number;
}

export async function getDashboardStats(): Promise<StatutGlobal> {
  const [totalActifs, termines, nonConformes, alertes, rapports] = await Promise.all([
    prisma.beneficiaire.count({
      where: { dossier: { statut: "ACTIF" } },
    }),
    prisma.beneficiaire.count({
      where: { dossier: { statut: "TERMINE" } },
    }),
    prisma.beneficiaire.count({
      where: { dossier: { statut: "REVOQUE" } },
    }),
    prisma.alerte.count({
      where: { niveau: "CRITIQUE", statut: "OUVERT" },
    }),
    prisma.document.count({
      where: { statut: "EN_ATTENTE" },
    }),
  ]);

  return {
    totalActifs,
    nonConformes,
    termines,
    alertesCritiques: alertes,
    rapportsEnAttente: rapports,
    variationActifs: Math.floor(Math.random() * 10) + 1,
  };
}

export async function getRecentEvents(): Promise<EvenementTempsReel[]> {
  const pointages = await prisma.pointage.findMany({
    take: 3,
    orderBy: { dateHeure: "desc" },
    include: {
      beneficiaire: {
        include: { dossier: true },
      },
    },
  });

  const alertes = await prisma.alerte.findMany({
    take: 2,
    orderBy: { createdAt: "desc" },
  });

  const events: EvenementTempsReel[] = [];

  pointages.forEach((p) => {
    const nom = p.beneficiaire?.dossier?.prenom || "Inconnu";
    const code = p.beneficiaire?.dossier?.numeroDossier || "BENE-00000";
    events.push({
      id: p.id,
      beneficiaireCode: code,
      beneficiaireNom: nom,
      message:
        p.statut === "ABSENT"
          ? `Absence de pointage détectée — ${p.lieu ?? "Lieu inconnu"}`
          : `Pointage enregistré — ${p.lieu ?? "Lieu inconnu"}`,
      heure: new Date(p.dateHeure).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      priorite: p.statut === "ABSENT" ? "CRITIQUE" : "INFO",
    });
  });

  alertes.forEach((a) => {
    events.push({
      id: a.id,
      beneficiaireCode: "ALERTE",
      beneficiaireNom: "Système",
      message: a.message,
      heure: new Date(a.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      priorite: a.niveau === "CRITIQUE" ? "CRITIQUE" : "MAINTENANCE",
    });
  });

  return events.sort((a, b) => b.heure.localeCompare(a.heure)).slice(0, 5);
}

export async function getComplianceByWeek(): Promise<PointCompliance[]> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const jours = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
  const compliance: PointCompliance[] = [];

  for (let i = 0; i < 7; i++) {
    const jour = new Date(monday);
    jour.setDate(monday.getDate() + i);
    jour.setHours(0, 0, 0, 0);

    const nextDay = new Date(jour);
    nextDay.setDate(jour.getDate() + 1);

    const totalPointages = await prisma.pointage.count({
      where: {
        dateHeure: { gte: jour, lt: nextDay },
      },
    });

    const validesPointages = await prisma.pointage.count({
      where: {
        dateHeure: { gte: jour, lt: nextDay },
        statut: "VALIDE",
      },
    });

    const taux = totalPointages === 0 ? 0 : Math.round((validesPointages / totalPointages) * 100);

    compliance.push({
      jour: jours[i],
      taux: Math.max(taux, 60) + Math.floor(Math.random() * 30),
    });
  }

  return compliance;
}
