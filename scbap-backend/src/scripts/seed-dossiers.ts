import "dotenv/config";
import { randomUUID } from "node:crypto";
import prisma from "../prisma";

const TARGET_COUNT = 20;
const RESET_SEED = process.env.RESET_SEED === "1";
const RESET_ALL = process.env.RESET_ALL === "1";

const NOMS = [
  "Kossi",
  "Ahouandjinou",
  "Rachidath",
  "Fifame",
  "Severin",
  "Kokou",
  "Sonia",
  "Moussa",
  "Clarisse",
  "Nathanael",
];

const PRENOMS = [
  "Jean",
  "Aurelien",
  "Mireille",
  "Karim",
  "Amina",
  "Brice",
  "Fatou",
  "Cedric",
  "Armel",
  "Lucie",
];

const VILLES = [
  "Cotonou",
  "Porto-Novo",
  "Parakou",
  "Abomey",
  "Natitingou",
];

const PROFESSIONS = [
  "Commercant",
  "Artisan",
  "Mecanicien",
  "Enseignant",
  "Chauffeur",
];

const INFRACTIONS = [
  "Vol simple",
  "Abus de confiance",
  "Atteinte aux biens",
  "Fraude administrative",
  "Trouble a l'ordre public",
];

const CONDAMNATIONS = [
  "Peine avec sursis partiel",
  "Peine ferme avec amenagement",
  "Travaux d'interet general",
  "Surveillance renforcee",
  "Controle judiciaire",
];

const OBLIGATIONS = [
  "le beneficiaire se doit de pointer chaque lundi au commissariat de Cotonou avant 09:00.",
  "le beneficiaire se doit de respecter le couvre-feu a partir de 20:00.",
  "le beneficiaire se doit de ne pas quitter le territoire national sans autorisation.",
  "le beneficiaire se doit de suivre un accompagnement socio-professionnel hebdomadaire.",
  "le beneficiaire se doit de signaler tout changement d'adresse sous 48 heures.",
  "le beneficiaire se doit de respecter les zones interdites definies par le juge.",
  "le beneficiaire se doit de se presenter a une visite de suivi medical mensuelle.",
  "le beneficiaire se doit de conserver un emploi ou une formation en cours.",
  "le beneficiaire se doit de maintenir le bracelet en bon etat de fonctionnement.",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function makeStamp(date = new Date()) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function makeCode(prefix: string, index: number) {
  const stamp = makeStamp();
  const rand = randomUUID().slice(0, 4).toUpperCase();
  return `${prefix}-${stamp}-${String(index).padStart(3, "0")}-${rand}`;
}

function pickObligations(index: number) {
  const base = [
    OBLIGATIONS[0],
    OBLIGATIONS[1],
    OBLIGATIONS[2],
    OBLIGATIONS[3],
    OBLIGATIONS[4],
    OBLIGATIONS[5],
    OBLIGATIONS[6],
    OBLIGATIONS[7],
  ];

  if (index % 3 === 0) {
    base[7] = OBLIGATIONS[8];
  }

  return base;
}

function buildObligationPayloads() {
  return [
    {
      categorieNom: "POINTAGE",
      description: OBLIGATIONS[0],
      type: "POINTAGE",
      frequence: "HEBDOMADAIRE",
      jour_semaine: "LUNDI",
      heure: "09:00",
      lieu: "Commissariat de Cotonou",
    },
    {
      categorieNom: "COUVRE_FEU",
      description: OBLIGATIONS[1],
      type: "COUVRE_FEU",
      frequence: "QUOTIDIEN",
      heure: "20:00",
      lieu: "Domicile",
    },
    {
      categorieNom: "INTERDICTION_ZONE",
      description: OBLIGATIONS[2],
      type: "INTERDICTION_ZONE",
      frequence: "PERMANENT",
    },
    {
      categorieNom: "OBLIGATION_TRAVAIL",
      description: OBLIGATIONS[3],
      type: "OBLIGATION_TRAVAIL",
      frequence: "HEBDOMADAIRE",
    },
    {
      categorieNom: "OBLIGATION_TRAVAIL",
      description: OBLIGATIONS[4],
      type: "OBLIGATION_TRAVAIL",
      frequence: "PONCTUEL",
    },
    {
      categorieNom: "INTERDICTION_ZONE",
      description: OBLIGATIONS[5],
      type: "INTERDICTION_ZONE",
      frequence: "PERMANENT",
    },
    {
      categorieNom: "SUIVI_MEDICAL",
      description: OBLIGATIONS[6],
      type: "SUIVI_MEDICAL",
      frequence: "MENSUEL",
    },
    {
      categorieNom: "OBLIGATION_TRAVAIL",
      description: OBLIGATIONS[7],
      type: "OBLIGATION_TRAVAIL",
      frequence: "MENSUEL",
    },
    {
      categorieNom: "SUIVI_MEDICAL",
      description: OBLIGATIONS[8],
      type: "SUIVI_MEDICAL",
      frequence: "PONCTUEL",
    },
  ];
}

async function seedDossiers() {
  if (RESET_ALL || RESET_SEED) {
    const seedFilter = {
      dossier: {
        othersData: {
          path: ["source"],
          equals: "seed",
        },
      },
    } as const;

    const obligationsWhere = RESET_ALL ? {} : seedFilter;
    const beneficiairesWhere = RESET_ALL ? {} : seedFilter;
    const dossiersWhere = RESET_ALL
      ? {}
      : {
          othersData: {
            path: ["source"],
            equals: "seed",
          },
        };

    const deletedObligations = await prisma.obligation.deleteMany({
      where: obligationsWhere,
    });

    const deletedBeneficiaires = await prisma.beneficiaire.deleteMany({
      where: beneficiairesWhere,
    });

    const deletedDossiers = await prisma.dossier.deleteMany({
      where: dossiersWhere,
    });

    console.log(
      `${RESET_ALL ? "Reset total" : "Seed reset"}: ${deletedDossiers.count} dossiers, ${deletedBeneficiaires.count} beneficiaires, ${deletedObligations.count} obligations supprimes.`,
    );
  }

  const existingCount = await prisma.dossier.count({
    where: { deletedAt: null },
  });

  const toCreate = Math.max(0, TARGET_COUNT - existingCount);

  if (toCreate === 0) {
    return { createdCount: 0 };
  }

  const categories = await prisma.categorieObligation.findMany({
    select: { id: true, nom: true },
  });
  const categorieByName = new Map(
    categories.map((category) => [category.nom, category.id]),
  );
  const payloads = buildObligationPayloads();

  for (let i = 0; i < toCreate; i += 1) {
    const idx = existingCount + i + 1;
    const nom = NOMS[idx % NOMS.length];
    const prenom = PRENOMS[idx % PRENOMS.length];
    const ville = VILLES[idx % VILLES.length];
    const profession = PROFESSIONS[idx % PROFESSIONS.length];
    const infraction = INFRACTIONS[idx % INFRACTIONS.length];
    const condamnation = CONDAMNATIONS[idx % CONDAMNATIONS.length];
    const obligationList = pickObligations(idx);
    const numeroDossier = makeCode("DOS", idx);
    const numeroMandatDepot = makeCode("MD", idx);
    const dateMandatDepot = new Date(Date.now() - 1000 * 60 * 60 * 24 * (10 + i));
    const dateFinPeine = new Date(Date.now() + 1000 * 60 * 60 * 24 * (180 + i * 3));
    const dateNaissance = new Date(1980 + (idx % 20), idx % 12, 5 + (idx % 20));
    const sexe = idx % 2 === 0 ? "M" : "F";

    await prisma.$transaction(async (tx) => {
      const dossier = await tx.dossier.create({
        data: {
          numeroDossier,
          juridictionId: String((idx % 5) + 1),
          prisonId: String((idx % 4) + 1),
          nom,
          prenom,
          dateNaissance,
          lieuNaissance: ville,
          nationalite: "Beninoise",
          sexe,
          profession,
          adresse: `Quartier ${pad2((idx % 12) + 1)}, ${ville}`,
          telephoneContact: `+229 97 ${pad2(idx)} ${pad2(idx + 1)} ${pad2(idx + 2)}`,
          infractions: infraction,
          numeroMandatDepot,
          dateMandatDepot,
          condamnation,
          dateFinPeine,
          dureePeineMois: 12 + i,
          observations: `Dossier genere automatiquement le ${makeStamp()}.`,
          obligations: obligationList.join("\n"),
          othersData: {
            source: "seed",
            batch: makeStamp(),
            notes: "Donnees fictives pour tests.",
          },
          statut: "ACTIF",
        },
      });

      const beneficiaire = await tx.beneficiaire.create({
        data: {
          dossierId: dossier.id,
          statut: "ACTIF",
          qrCode: `BEN-${numeroDossier}-${randomUUID().slice(0, 8)}`,
        },
      });

      const obligationsToCreate = payloads
        .slice(0, 8)
        .map((payload, index) => {
          const categorieId = categorieByName.get(payload.categorieNom);

          if (!categorieId) {
            throw new Error(
              `Categorie manquante pour le seed: ${payload.categorieNom}`,
            );
          }

          return {
            beneficiaireId: beneficiaire.id,
            dossierId: dossier.id,
            categorieId,
            description: obligationList[index] ?? payload.description,
            type: payload.type,
            frequence: payload.frequence,
            jourSemaine: payload.jour_semaine,
            heure: payload.heure ? new Date(`1970-01-01T${payload.heure}Z`) : null,
            lieu: payload.lieu,
            statutStructuration: "A_VERIFIER",
            statut: "EN_COURS",
            createdAt: new Date(),
          };
        });

      await tx.obligation.createMany({
        data: obligationsToCreate,
      });
    });
  }

  return { createdCount: toCreate };
}

async function main() {
  const result = await seedDossiers();
  console.log(`Seed dossiers termine: ${result.createdCount} dossier(s) cree(s).`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des dossiers:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
