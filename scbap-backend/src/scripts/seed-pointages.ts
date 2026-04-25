import bcrypt from "bcryptjs";
import prisma from "../prisma";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureAgentUser() {
  const role = await prisma.role.findFirst({
    where: { nom: "AGENT_SPIP" },
  });

  const ensuredRole =
    role ??
    (await prisma.role.create({
      data: { nom: "AGENT_SPIP" },
    }));

  const structure = await prisma.structure.upsert({
    where: { code: "SPIP-COTONOU" },
    update: {},
    create: {
      nom: "SPIP Cotonou",
      code: "SPIP-COTONOU",
      type: "SPIP",
      juridiction: "Cotonou",
    },
  });

  const email = "agent.spip@scbap.bj";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      nom: "Agent",
      prenom: "SPIP",
      email,
      telephone: "90000000",
      motDePasse: await bcrypt.hash("change_me", 10),
      roleId: ensuredRole.id,
      structureId: structure.id,
      statut: "ACTIF",
    },
  });
}

async function main() {
  const reset = process.env.RESET_SEED === "1";
  if (reset) {
    const deleted = await prisma.pointage.deleteMany();
    console.log(`Seed reset: ${deleted.count} pointage(s) supprime(s).`);
  }

  const agent = await ensureAgentUser();

  const beneficiaires = await prisma.beneficiaire.findMany({
    include: {
      obligations: true,
    },
  });

  let created = 0;

  for (const beneficiaire of beneficiaires) {
    const obligations = beneficiaire.obligations;
    if (!obligations.length) continue;

    for (let i = 0; i < 5; i += 1) {
      const obligation = obligations[i % obligations.length];
      const dateHeure = new Date();
      dateHeure.setMinutes(dateHeure.getMinutes() - randomInt(30, 4320)); // jusqu'à 3 jours
      const roll = randomInt(1, 100);
      const statut =
        roll <= 70 ? "VALIDE" : roll <= 85 ? "ABSENT" : "REFUSE";

      await prisma.pointage.create({
        data: {
          beneficiaireId: beneficiaire.id,
          obligationId: obligation.id,
          agentId: agent.id,
          dateHeure,
          lieu: obligation.lieu ?? "SPIP Cotonou",
          type: "VALIDATION_AGENT",
          statut,
          commentaire: `Pointage auto seed (${statut})`,
        },
      });

      created += 1;
    }
  }

  console.log(`Seed pointages termine: ${created} pointage(s) cree(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
