import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import { listDapgObligationsSpecifiques } from "../integrations/dapg/client";
import type { DapgObligationSpecifique } from "../integrations/dapg/types";

export type NormalizedSpecificObligation = {
  dapgId?: number;
  section?: string;
  code: string;
  categorie: string;
  libelle: string;
  raw: Prisma.InputJsonValue;
};

function normalizeText(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeDapgId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function normalizeSpecificObligation(
  input: DapgObligationSpecifique | Record<string, unknown>,
): NormalizedSpecificObligation | null {
  const rawInput = input as Record<string, unknown>;
  const code = normalizeText(input.code);
  const categorie = normalizeText(input.categorie);
  const libelle = normalizeText(input.libelle)
    ?? normalizeText(input.texte)
    ?? normalizeText(input.texte_formate);

  if (!code || !categorie || !libelle) {
    return null;
  }

  return {
    dapgId: normalizeDapgId(rawInput.obligation_id ?? rawInput.id ?? rawInput.dapgId),
    section: normalizeText(input.section),
    code,
    categorie,
    libelle,
    raw: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
  };
}

export function normalizeSpecificObligationsPayload(
  input: unknown,
): NormalizedSpecificObligation[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) =>
      item && typeof item === "object"
        ? normalizeSpecificObligation(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is NormalizedSpecificObligation => item !== null);
}

export async function getObligationCategoryByNameOrThrow(categorieNom: string) {
  const existing = await prisma.categorieObligation.findFirst({
    where: {
      nom: {
        equals: categorieNom,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return existing;
  }

  throw new HttpError(
    500,
    `Categorie d'obligation DAPG manquante en base: ${categorieNom}. Lancez le seed des categories avant l'import.`,
  );
}

export async function upsertSpecificObligationReferences(
  obligations: NormalizedSpecificObligation[],
) {
  const references = [];

  for (const obligation of obligations) {
    const categorie = await getObligationCategoryByNameOrThrow(obligation.categorie);

    references.push(
      await prisma.obligationSpecifiqueReference.upsert({
        where: { code: obligation.code },
        create: {
          dapgId: obligation.dapgId,
          section: obligation.section,
          code: obligation.code,
          categorieId: categorie.id,
          libelle: obligation.libelle,
          metadata: {
            source: "dapg_obligations_specifiques",
            raw: obligation.raw,
          },
        },
        update: {
          dapgId: obligation.dapgId,
          section: obligation.section,
          categorieId: categorie.id,
          libelle: obligation.libelle,
          active: true,
          metadata: {
            source: "dapg_obligations_specifiques",
            raw: obligation.raw,
          },
        },
        include: {
          categorie: true,
        },
      }),
    );
  }

  return references;
}

export async function syncDapgSpecificObligationReferences() {
  const firstPage = await listDapgObligationsSpecifiques(1, 50);
  const pages = Math.max(firstPage.last_page, 1);
  const pagePayloads = [firstPage];

  for (let pageNumber = 2; pageNumber <= pages; pageNumber += 1) {
    pagePayloads.push(await listDapgObligationsSpecifiques(pageNumber, 50));
  }

  const obligations = pagePayloads.flatMap((page) =>
    page.data
      .map((item) => normalizeSpecificObligation(item))
      .filter((item): item is NormalizedSpecificObligation => item !== null),
  );

  const references = await upsertSpecificObligationReferences(obligations);

  return {
    totalSynced: references.length,
    references,
  };
}

export async function listSpecificObligationReferences() {
  return prisma.obligationSpecifiqueReference.findMany({
    include: {
      categorie: true,
    },
    orderBy: [{ active: "desc" }, { section: "asc" }, { libelle: "asc" }],
  });
}

export async function updateSpecificObligationReference(
  id: string,
  input: {
    section?: string | null;
    code?: string;
    categorieId?: string;
    libelle?: string;
    active?: boolean;
  },
) {
  if (input.categorieId) {
    const categorie = await prisma.categorieObligation.findUnique({
      where: { id: input.categorieId },
    });

    if (!categorie) {
      throw new HttpError(404, "Categorie d'obligation introuvable");
    }
  }

  return prisma.obligationSpecifiqueReference.update({
    where: { id },
    data: {
      ...(input.section !== undefined ? { section: input.section?.trim() || null } : {}),
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
      ...(input.categorieId !== undefined ? { categorieId: input.categorieId } : {}),
      ...(input.libelle !== undefined ? { libelle: input.libelle.trim() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    include: {
      categorie: true,
    },
  });
}

export async function deleteSpecificObligationReference(id: string) {
  const linked = await prisma.obligation.count({
    where: {
      obligationSpecifiqueReferenceId: id,
    },
  });

  if (linked > 0) {
    return prisma.obligationSpecifiqueReference.update({
      where: { id },
      data: { active: false },
      include: {
        categorie: true,
      },
    });
  }

  return prisma.obligationSpecifiqueReference.delete({
    where: { id },
    include: {
      categorie: true,
    },
  });
}
