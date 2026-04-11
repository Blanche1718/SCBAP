import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
  CategorieObligationSchema,
  UpdateCategorieObligationSchema,
} from "../schemas/categorie-obligation.schema";
import { z } from "zod";

type CreateCategorieObligationInput = z.infer<typeof CategorieObligationSchema>;
type UpdateCategorieObligationInput = z.infer<
  typeof UpdateCategorieObligationSchema
>;

export const DEFAULT_CATEGORIES_OBLIGATION = [
  {
    nom: "POINTAGE",
    description: "Obligation de se presenter a une structure a une frequence definie.",
  },
 
];

async function ensureCategoryNameAvailable(nom: string, excludeId?: number) {
  const existingCategory = await prisma.categorieObligation.findFirst({
    where: {
      nom: {
        equals: nom,
        mode: "insensitive",
      },
      ...(excludeId !== undefined && {
        NOT: {
          id: excludeId,
        },
      }),
    },
  });

  if (existingCategory) {
    throw new HttpError(
      409,
      "Une categorie d'obligation avec ce nom existe deja",
    );
  }
}

export async function getCategoriesObligation() {
  return prisma.categorieObligation.findMany({
    orderBy: {
      nom: "asc",
    },
  });
}

export async function getCategorieObligationById(id: number) {
  return prisma.categorieObligation.findUniqueOrThrow({
    where: { id },
    include: {
      obligations: true,
    },
  });
}

export async function createCategorieObligation(
  input: CreateCategorieObligationInput,
) {
  const data = CategorieObligationSchema.parse(input);

  await ensureCategoryNameAvailable(data.nom);

  return prisma.categorieObligation.create({
    data,
  });
}

export async function updateCategorieObligation(
  id: number,
  input: UpdateCategorieObligationInput,
) {
  const data = UpdateCategorieObligationSchema.parse(input);

  await prisma.categorieObligation.findUniqueOrThrow({
    where: { id },
  });

  if (data.nom !== undefined) {
    await ensureCategoryNameAvailable(data.nom, id);
  }

  return prisma.categorieObligation.update({
    where: { id },
    data,
  });
}

export async function deleteCategorieObligation(id: number) {
  await prisma.categorieObligation.findUniqueOrThrow({
    where: { id },
  });

  return prisma.categorieObligation.delete({
    where: { id },
  });
}

export async function seedCategoriesObligation() {
  const existingCategories = await prisma.categorieObligation.findMany({
    select: {
      nom: true,
    },
  });

  const existingNames = new Set(
    existingCategories.map((category) => category.nom.toLowerCase()),
  );

  const categoriesToCreate = DEFAULT_CATEGORIES_OBLIGATION.filter(
    (category) => !existingNames.has(category.nom.toLowerCase()),
  );

  if (categoriesToCreate.length === 0) {
    return {
      createdCount: 0,
      createdCategories: [] as typeof DEFAULT_CATEGORIES_OBLIGATION,
    };
  }

  await prisma.categorieObligation.createMany({
    data: categoriesToCreate,
  });

  return {
    createdCount: categoriesToCreate.length,
    createdCategories: categoriesToCreate,
  };
}
