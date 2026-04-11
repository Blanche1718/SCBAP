import "dotenv/config";
import prisma from "../prisma";
import {
  seedCategoriesObligation,
} from "../services/categorie-obligation.service";

async function main() {
  const result = await seedCategoriesObligation();

  console.log(
    `Seed categories obligations termine: ${result.createdCount} categorie(s) creee(s).`,
  );

  if (result.createdCategories.length > 0) {
    console.log(
      "Categories creees:",
      result.createdCategories.map((category) => category.nom).join(", "),
    );
  }
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des categories d'obligations:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
