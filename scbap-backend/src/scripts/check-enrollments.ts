import prisma from "../prisma";

async function main() {
  const enrollments = await prisma.beneficiaire.findMany({
    where: {
      biometrieEnrolementStatut: {
        in: ["EN_COURS", "CONFIRME"],
      },
    },
    select: {
      id: true,
      dossier: {
        select: {
          nom: true,
          prenom: true,
        },
      },
      biometrieEnrolementCode: true,
      biometrieEnrolementStatut: true,
      biometrieVerificationEssais: true,
      biometrieProchaineVerificationLe: true,
      biometrieDerniereVerificationLe: true,
      biometrieEnrolementDemandeeLe: true,
    },
  });

  console.log(`\n📊 Total enrôlements : ${enrollments.length}\n`);

  enrollments.forEach((e) => {
    console.log(`📝 ${e.dossier?.nom} ${e.dossier?.prenom}`);
    console.log(`   Code: ${e.biometrieEnrolementCode}`);
    console.log(`   Statut: ${e.biometrieEnrolementStatut}`);
    console.log(`   Essais: ${e.biometrieVerificationEssais}`);
    console.log(`   Demandée le: ${e.biometrieEnrolementDemandeeLe}`);
    console.log(`   Dernière vérif: ${e.biometrieDerniereVerificationLe}`);
    console.log(`   Prochaine vérif: ${e.biometrieProchaineVerificationLe}\n`);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
