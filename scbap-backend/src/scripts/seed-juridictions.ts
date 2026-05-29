import prisma from "../prisma";
import { normalizeJuridictionCode } from "../utils/juridiction";

const JURIDICTIONS = [
  { nom: "Cotonou" },
  { nom: "Porto-Novo" },
  { nom: "Parakou" },
  { nom: "Abomey" },
  { nom: "Natitingou" },
];

const LEGACY_MAPPINGS = [
  { legacy: "1", nom: "Cotonou" },
  { legacy: "2", nom: "Porto-Novo" },
  { legacy: "3", nom: "Parakou" },
  { legacy: "4", nom: "Abomey" },
  { legacy: "5", nom: "Natitingou" },
];

async function main() {
  let createdCount = 0;

  for (const item of JURIDICTIONS) {
    const id = normalizeJuridictionCode(item.nom);
    const existing = await prisma.juridiction.findUnique({ where: { id } });

    if (!existing) {
      await prisma.juridiction.create({
        data: {
          id,
          nom: item.nom,
        },
      });
      createdCount += 1;
    }
  }

  for (const mapping of LEGACY_MAPPINGS) {
    const targetId = normalizeJuridictionCode(mapping.nom);
    await prisma.dossier.updateMany({
      where: { juridictionId: mapping.legacy },
      data: { juridictionId: targetId },
    });
  }

  console.log(`Seed juridictions termine: ${createdCount} juridiction(s) creee(s).`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des juridictions:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
