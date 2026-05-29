import "dotenv/config";
import prisma from "../prisma";

const RESET_SEED = process.env.RESET_SEED === "1";
const TARGET_COUNT = 5;
const BRACELET_PREFIX = "BR-SEED";

function buildBraceletCode(index: number) {
  return `${BRACELET_PREFIX}-${String(index).padStart(3, "0")}`;
}

async function main() {
  if (RESET_SEED) {
    const deletedPositions = await prisma.positionGPS.deleteMany({
      where: {
        bracelet: {
          codeImei: {
            startsWith: BRACELET_PREFIX,
          },
        },
      },
    });

    const deletedAlertes = await prisma.alerteSurveillance.deleteMany({
      where: {
        bracelet: {
          codeImei: {
            startsWith: BRACELET_PREFIX,
          },
        },
      },
    });

    const deletedIncidents = await prisma.incidentBracelet.deleteMany({
      where: {
        bracelet: {
          codeImei: {
            startsWith: BRACELET_PREFIX,
          },
        },
      },
    });

    const deletedAffectations = await prisma.affectationBracelet.deleteMany({
      where: {
        bracelet: {
          codeImei: {
            startsWith: BRACELET_PREFIX,
          },
        },
      },
    });

    const deletedBracelets = await prisma.bracelet.deleteMany({
      where: {
        codeImei: {
          startsWith: BRACELET_PREFIX,
        },
      },
    });

    console.log(
      `Seed reset: ${deletedPositions.count} position(s), ${deletedAlertes.count} alerte(s), ${deletedIncidents.count} incident(s), ${deletedAffectations.count} affectation(s) et ${deletedBracelets.count} bracelet(s) supprime(s).`,
    );
  }

  const beneficiaires = await prisma.beneficiaire.findMany({
    orderBy: {
      createdAt: "asc",
    },
    include: {
      dossier: true,
      affectationsBracelet: {
        where: {
          dateFin: null,
        },
        take: 1,
      },
    },
  });

  if (!beneficiaires.length) {
    console.log("Aucun beneficiaire disponible pour le seed des bracelets.");
    return;
  }

  const existingSeedBracelets = await prisma.bracelet.count({
    where: {
      codeImei: {
        startsWith: BRACELET_PREFIX,
      },
    },
  });

  if (existingSeedBracelets >= TARGET_COUNT) {
    console.log(
      `Seed bracelets ignore: ${existingSeedBracelets} bracelet(s) ${BRACELET_PREFIX} existent deja. Utilisez RESET_SEED=1 pour les regenerer.`,
    );
    return;
  }

  let created = 0;
  let nextBraceletIndex = existingSeedBracelets + 1;

  for (let index = 0; index < beneficiaires.length && created < TARGET_COUNT; index += 1) {
    const beneficiaire = beneficiaires[index];
    if (beneficiaire.affectationsBracelet.length > 0) {
      continue;
    }

    const codeImei = buildBraceletCode(nextBraceletIndex);
    nextBraceletIndex += 1;
    const bracelet = await prisma.bracelet.upsert({
      where: { codeImei },
      update: {
        identifiantPorteur: beneficiaire.dossier.numeroDossier,
        modele: "YOUPI-LAB V2",
        fabricant: "YoupiLab Cotonou",
        statut: "AFFECTE",
        dateActivation: new Date(),
      },
      create: {
        codeImei,
        identifiantPorteur: beneficiaire.dossier.numeroDossier,
        modele: "YOUPI-LAB V2",
        fabricant: "YoupiLab Cotonou",
        statut: "AFFECTE",
        dateActivation: new Date(),
      },
    });

    await prisma.affectationBracelet.create({
      data: {
        braceletId: bracelet.id,
        beneficiaireId: beneficiaire.id,
        dateDebut: new Date(),
      },
    });

    created += 1;
  }

  console.log(`Seed bracelets termine: ${created} bracelet(s) cree(s) et affecte(s).`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des bracelets:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
