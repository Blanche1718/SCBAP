import prisma from "../prisma";

export async function getJuridictions() {
  const juridictions = await prisma.juridiction.findMany({
    orderBy: { nom: "asc" },
  });

  return juridictions;
}
