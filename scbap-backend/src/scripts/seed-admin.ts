import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../prisma";

async function ensureAdminUser() {
  const role =
    (await prisma.role.findFirst({
      where: { nom: "ADMIN" },
    })) ??
    (await prisma.role.create({
      data: { nom: "ADMIN" },
    }));

  const structure =
    (await prisma.structure.findUnique({
      where: { code: "ADMIN-SCBAP" },
    })) ??
    (await prisma.structure.create({
      data: {
        nom: "Administration SCBAP",
        code: "ADMIN-SCBAP",
        type: "ADMINISTRATION",
        juridiction: null,
      },
    }));

  const email = "admin.scbap@scbap.bj";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      nom: "Admin",
      prenom: "SCBAP",
      email,
      telephone: "90000001",
      motDePasse: await bcrypt.hash("change_me", 10),
      roleId: role.id,
      structureId: structure.id,
      statut: "ACTIF",
    },
  });
}

async function main() {
  const user = await ensureAdminUser();
  console.log(`Admin cree/verifie: ${user.email}`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed de l'admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
