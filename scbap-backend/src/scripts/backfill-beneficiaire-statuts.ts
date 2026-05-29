import prisma from "../prisma";

type BeneficiaireStatusRow = {
  id: string;
  statut: string;
  profilStatut: string | null;
  profilConfirme: boolean;
  profilConfirmeLe: Date | null;
  createdAt: Date;
};

function deriveStatus(row: BeneficiaireStatusRow) {
  if (row.profilStatut === "REVOQUE" || row.statut === "REVOQUE") {
    return "REVOQUE";
  }

  return row.profilConfirme ? "ACTIF" : "A_CONFIGURER";
}

async function main() {
  const rows = await prisma.beneficiaire.findMany({
    select: {
      id: true,
      statut: true,
      profilStatut: true,
      profilConfirme: true,
      profilConfirmeLe: true,
      createdAt: true,
    },
  });

  let updatedCount = 0;

  for (const row of rows) {
    const nextStatus = deriveStatus(row);
    const nextProfilConfirme = nextStatus === "ACTIF";
    const nextProfilConfirmeLe = nextProfilConfirme
      ? row.profilConfirmeLe ?? row.createdAt
      : null;

    const needsUpdate =
      row.statut !== nextStatus ||
      row.profilStatut !== nextStatus ||
      row.profilConfirme !== nextProfilConfirme ||
      (row.profilConfirmeLe?.getTime() ?? null) !== (nextProfilConfirmeLe?.getTime() ?? null);

    if (!needsUpdate) {
      continue;
    }

    await prisma.beneficiaire.update({
      where: { id: row.id },
      data: {
        statut: nextStatus,
        profilStatut: nextStatus,
        profilConfirme: nextProfilConfirme,
        profilConfirmeLe: nextProfilConfirmeLe,
      },
    });

    updatedCount += 1;
  }

  console.log(
    `Backfill termine: ${updatedCount} beneficiaire(s) mis en coherence sur ${rows.length}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
