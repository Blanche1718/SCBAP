import prisma from "../prisma";
import { forceVerifyBiometrieEnrolement } from "../services/biometrie.service";

async function main() {
  // Récupère un des enrôlements bloqués
  const blocked = await prisma.beneficiaire.findFirst({
    where: {
      biometrieEnrolementStatut: "EN_COURS",
    },
    select: {
      id: true,
      dossier: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  });

  if (!blocked) {
    console.log("Aucun enrôlement en cours trouvé");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🔄 Forçage de la vérification pour ${blocked.dossier?.nom} ${blocked.dossier?.prenom}...\n`);

  try {
    // Mock un utilisateur admin pour tester
    const result = await forceVerifyBiometrieEnrolement(blocked.id, {
      role: { nom: "ADMIN" },
      structure: undefined,
    } as any);

    console.log("✅ Résultat :", result);
  } catch (error) {
    console.error("❌ Erreur :", error instanceof Error ? error.message : error);
  }

  await prisma.$disconnect();
}

main();
