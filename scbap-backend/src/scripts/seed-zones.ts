import "dotenv/config";
import prisma from "../prisma";

const RESET_SEED = process.env.RESET_SEED === "1";
const TARGET_COUNT = Number(process.env.ZONE_SEED_TARGET_COUNT ?? "20");
const ZONE_PREFIX = "SEED -";

type JurisdictionKey = "Cotonou" | "Porto-Novo" | "Parakou" | "Abomey" | "Natitingou";

const JURIDICTION_CENTERS: Record<JurisdictionKey, { lat: number; lng: number }> = {
  Cotonou: { lat: 6.3703, lng: 2.3912 },
  "Porto-Novo": { lat: 6.4969, lng: 2.6289 },
  Parakou: { lat: 9.3372, lng: 2.6303 },
  Abomey: { lat: 7.1829, lng: 1.9917 },
  Natitingou: { lat: 10.3042, lng: 1.3794 },
};

function squareAround(lat: number, lng: number, deltaLat: number, deltaLng: number) {
  return [
    [Number((lat - deltaLat).toFixed(6)), Number((lng - deltaLng).toFixed(6))],
    [Number((lat - deltaLat).toFixed(6)), Number((lng + deltaLng).toFixed(6))],
    [Number((lat + deltaLat).toFixed(6)), Number((lng + deltaLng).toFixed(6))],
    [Number((lat + deltaLat).toFixed(6)), Number((lng - deltaLng).toFixed(6))],
  ] as [number, number][];
}

function pickCenter(juridiction?: string | null) {
  if (!juridiction) {
    return JURIDICTION_CENTERS.Cotonou;
  }

  if (juridiction in JURIDICTION_CENTERS) {
    return JURIDICTION_CENTERS[juridiction as JurisdictionKey];
  }

  return JURIDICTION_CENTERS.Cotonou;
}

async function main() {
  if (RESET_SEED) {
    const deleted = await prisma.zone.deleteMany({
      where: {
        nom: {
          startsWith: ZONE_PREFIX,
        },
      },
    });

    console.log(`Seed reset: ${deleted.count} zone(s) supprimee(s).`);
  }

  const beneficiaires = await prisma.beneficiaire.findMany({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      affectationsBracelet: {
        some: {
          dateFin: null,
          bracelet: {
            codeImei: {
              startsWith: "BR-SEED",
            },
          },
        },
      },
    },
    include: {
      dossier: {
        include: {
          juridiction: true,
        },
      },
      zones: {
        where: {
          nom: {
            startsWith: ZONE_PREFIX,
          },
        },
      },
    },
    take: TARGET_COUNT,
  });

  let created = 0;

  for (const beneficiaire of beneficiaires) {
    if (beneficiaire.zones.length > 0) {
      continue;
    }

    const center = pickCenter(beneficiaire.dossier.juridiction?.nom ?? beneficiaire.dossier.juridictionId);
    const homePolygon = squareAround(center.lat, center.lng, 0.012, 0.015);
    const interditePolygon = squareAround(center.lat + 0.03, center.lng + 0.03, 0.007, 0.009);

    await prisma.zone.createMany({
      data: [
        {
          beneficiaireId: beneficiaire.id,
          nom: `${ZONE_PREFIX} Zone autorisée`,
          type: "AUTORISEE",
          geometrie: [homePolygon],
          rayon: null,
        },
        {
          beneficiaireId: beneficiaire.id,
          nom: `${ZONE_PREFIX} Zone interdite`,
          type: "INTERDITE",
          geometrie: [interditePolygon],
          rayon: null,
        },
      ],
    });

    created += 1;
  }

  console.log(`Seed zones termine: ${created} beneficiaire(s) equipe(s) de zones.`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des zones:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
