import prisma from "../prisma";
import { logger } from "../logger";

async function main() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    logger.error("Database validation failed", {
      reason: "No users found. Run the admin seed before deployment.",
    });
    process.exit(1);
  }

  logger.info("Database validation passed", { userCount });
}

main()
  .catch((error) => {
    logger.error("Database validation failed", { error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
