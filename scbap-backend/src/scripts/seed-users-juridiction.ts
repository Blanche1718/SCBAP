import bcrypt from "bcryptjs";
import prisma from "../prisma";
import { normalizeJuridictionCode } from "../utils/juridiction";

const USERS = [
  {
    nom: "Agent",
    prenom: "Cotonou",
    email: "agent.cotonou@scbap.bj",
    telephone: "90000010",
    juridiction: "Cotonou",
  },
  {
    nom: "Agent",
    prenom: "PortoNovo",
    email: "agent.porto.novo@scbap.bj",
    telephone: "90000011",
    juridiction: "Porto-Novo",
  },
  {
    nom: "Agent",
    prenom: "Parakou",
    email: "agent.parakou@scbap.bj",
    telephone: "90000012",
    juridiction: "Parakou",
  },
  {
    nom: "Agent",
    prenom: "Abomey",
    email: "agent.abomey@scbap.bj",
    telephone: "90000013",
    juridiction: "Abomey",
  },
  {
    nom: "Agent",
    prenom: "Natitingou",
    email: "agent.natitingou@scbap.bj",
    telephone: "90000014",
    juridiction: "Natitingou",
  },
];

async function ensureAgentRole() {
  return (
    (await prisma.role.findFirst({
      where: { nom: "AGENT_SPIP" },
    })) ??
    (await prisma.role.create({
      data: { nom: "AGENT_SPIP" },
    }))
  );
}

async function ensureStructure(juridiction: string) {
  const code = `SPIP-${normalizeJuridictionCode(juridiction)}`;

  return prisma.structure.upsert({
    where: { code },
    update: {
      juridiction,
    },
    create: {
      nom: `SPIP ${juridiction}`,
      code,
      type: "SPIP",
      juridiction,
    },
  });
}

async function ensureUser(
  roleId: string,
  structureId: string,
  payload: (typeof USERS)[number],
) {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existing) {
    return { user: existing, created: false };
  }

  const user = await prisma.user.create({
    data: {
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      telephone: payload.telephone,
      motDePasse: await bcrypt.hash("change_me", 10),
      roleId,
      structureId,
      statut: "ACTIF",
    },
  });

  return { user, created: true };
}

async function main() {
  const role = await ensureAgentRole();

  let createdCount = 0;
  for (const payload of USERS) {
    const structure = await ensureStructure(payload.juridiction);
    const { created } = await ensureUser(role.id, structure.id, payload);

    if (created) {
      createdCount += 1;
    }
  }

  console.log(`Seed utilisateurs juridiction termine: ${createdCount} utilisateur(s) verifie(s)/creee(s).`);
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed des utilisateurs par juridiction:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
