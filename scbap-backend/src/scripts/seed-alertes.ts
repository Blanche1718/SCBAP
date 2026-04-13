import prisma from "../prisma";

const TYPES = [
  "ABSENCE_POINTAGE",
  "SORTIE_ZONE",
  "RETRAIT_BRACELET",
  "BATTERIE_FAIBLE",
  "POWER_FAIL",
];

const SOURCES = ["SYSTEME", "AGENT", "BRACELET"];
const STATUTS = ["OUVERTE", "TRAITEE", "IGNOREE"];

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

async function main() {
  const reset = process.env.RESET_SEED === "1";
  if (reset) {
    const deleted = await prisma.alerte.deleteMany();
    console.log(`Seed reset: ${deleted.count} alerte(s) supprimee(s).`);
  }

  const beneficiaires = await prisma.beneficiaire.findMany();
  let created = 0;

  for (const beneficiaire of beneficiaires) {
    for (let i = 0; i < 2; i += 1) {
      const type = randomItem(TYPES);
      const niveau = type === "RETRAIT_BRACELET" || type === "SORTIE_ZONE" ? "CRITIQUE" : "NORMALE";
      const source = randomItem(SOURCES);
      const statut = randomItem(STATUTS);

      await prisma.alerte.create({
        data: {
          beneficiaireId: beneficiaire.id,
          type,
          niveau,
          message: `Alerte ${type.toLowerCase().replace("_", " ")}`,
          source,
          statut,
        },
      });

      created += 1;
    }
  }

  console.log(`Seed alertes termine: ${created} alerte(s) creee(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
