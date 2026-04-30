import { HttpError } from "../errorHandler";
import type { AuthenticatedUser } from "../auth/auth.types";
import prisma from "../prisma";
import { UpdateDossierSchema } from "../schemas/dossier.schema";
import { z } from "zod";
import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { getUserJuridictionCode } from "../utils/juridiction";

// TYPE TYPESCRIPT basé sur Zod
type UpdateDossierInput = z.infer<typeof UpdateDossierSchema>;
type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function buildDossierAccessFilter(user?: AccessContext): Prisma.DossierWhereInput {
  if (isAdminAccess(user)) {
    return {};
  }

  const jurisdictionCode = getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";

  return {
    juridictionId: jurisdictionCode,
  };
}

// FONCTION DE PARSING DE LA DATE
function parseDate(date?: string) {
  if (!date) return null;

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    throw new HttpError(400, "Date invalide");
  }

  return parsed;
}

// SERVICE DE RECUPERATION DES DOSSIERS

export async function getDossiers(page = 1, limit = 10, user?: AccessContext) {
  if (page <= 0 || limit <= 0) {
    throw new HttpError(400, "Parametres de pagination invalides");
  }
  const skip = (page-1)*limit;
  const accessFilter = buildDossierAccessFilter(user);
  const [dossiers, total] = await prisma.$transaction([
    prisma.dossier.findMany({
      where: {
        deletedAt: null,
        ...accessFilter,
      },
      include: {
        beneficiaire: true,
        juridiction: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.dossier.count({
      where: {
        deletedAt: null,
        ...accessFilter,
      },
    }),
  ]);

  return {
    data: dossiers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export async function buildDossiersExportWorkbook(user?: AccessContext) {
  const accessFilter = buildDossierAccessFilter(user);
  const dossiers = await prisma.dossier.findMany({
    where: {
      deletedAt: null,
      ...accessFilter,
    },
    include: {
      beneficiaire: true,
      juridiction: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SCBAP";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const sheet = workbook.addWorksheet("Beneficiaires");
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [
    { header: "Numéro dossier", key: "numeroDossier", width: 20 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Sexe", key: "sexe", width: 10 },
    { header: "Date de naissance", key: "dateNaissance", width: 15 },
    { header: "Prison", key: "prison", width: 24 },
    { header: "Juridiction", key: "juridiction", width: 18 },
    { header: "Numéro mandat dépôt", key: "numeroMandatDepot", width: 20 },
    { header: "Date mandat dépôt", key: "dateMandatDepot", width: 16 },
    { header: "Date fin peine", key: "dateFinPeine", width: 16 },
    { header: "Infractions", key: "infractions", width: 35 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF17362E" },
  };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = {
    from: "A1",
    to: "U1",
  };

  dossiers.forEach((dossier) => {
    sheet.addRow({
      numeroDossier: dossier.numeroDossier,
      nom: dossier.nom,
      prenom: dossier.prenom,
      sexe: dossier.sexe || "",
      dateNaissance: formatDate(dossier.dateNaissance),
      statutDossier: dossier.statut || "",
      profilStatut: dossier.beneficiaire?.profilStatut || "",
      profilConfirme: dossier.beneficiaire?.profilConfirme ? "Oui" : "Non",
      qrCode: dossier.beneficiaire?.qrCode || "",
      prison: dossier.prisonName || "",
      juridiction: dossier.juridiction?.nom || dossier.juridictionId || "",
      numeroMandatDepot: dossier.numeroMandatDepot || "",
      dateMandatDepot: formatDate(dossier.dateMandatDepot),
      dateFinPeine: formatDate(dossier.dateFinPeine),
      infractions: dossier.infractions || "",
      obligations: dossier.obligations || "",
      decisionDapg: dossier.decisionDapg || "",
      dateDecisionDapg: formatDate(dossier.dateDecisionDapg),
      dureeTempsEpreuve: dossier.dureeTempsEpreuve || "",
      observations: dossier.observations || "",
      createdAt: formatDate(dossier.createdAt),
    });
  });

  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowNumber > 1) {
      row.font = { size: 11 };
    }
  });

  return workbook;
}
 



// SERVICE DE RECUPERATION D'UN DOSSIER PAR SON ID
export async function getDossierById(id: string, user?: AccessContext) {
  return prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
      ...buildDossierAccessFilter(user),
    },
    include: {
      beneficiaire: true,
      juridiction: true,
    },
  });
}

export async function updateDossier(
  id: string,
  input: UpdateDossierInput,
  user?: AccessContext,
) {
  const data = UpdateDossierSchema.parse(input);

  await prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
      ...buildDossierAccessFilter(user),
    },
  });

  const rawData = {
    numeroDossier: data.numero_dossier,
    juridictionId: data.juridiction_id,
    prisonId: data.prison_id,
    prisonName: data.prison_name,
    nom: data.nom,
    prenom: data.prenom,
    dateNaissance: data.date_naissance
      ? parseDate(data.date_naissance)
      : undefined,
    lieuNaissance: data.lieu_naissance,
    nationalite: data.nationalite,
    sexe: data.sexe,
    profession: data.profession,
    adresse: data.adresse,
    telephoneContact: data.telephone_contact,
    infractions: data.infractions,
    numeroMandatDepot: data.numero_mandat_depot,
    dateMandatDepot: data.date_mandat_depot
      ? parseDate(data.date_mandat_depot)
      : undefined,
    condamnation: data.condamnation,
    dateFinPeine: data.date_fin_peine
      ? parseDate(data.date_fin_peine)
      : undefined,
    dureePeineMois: data.duree_peine_mois,
    decisionDapg: data.decision_dapg,
    dateDecisionDapg: data.date_decision_dapg
      ? parseDate(data.date_decision_dapg)
      : undefined,
    dureeTempsEpreuve: data.duree_temps_epreuve,
    observations: data.observations,
    obligations: data.obligations,
    othersData: data.others_data,
    statut: data.statut,
  };

  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([_, value]) => value !== undefined)
  );

  return prisma.dossier.update({
    where: { id },
    data: cleanData,
    include: {
      beneficiaire: true,
      juridiction: true,
    },
  });
}

export async function softDeleteDossier(id: string, user?: AccessContext) {
  await prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
      ...buildDossierAccessFilter(user),
    },
  });

  return prisma.dossier.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
    include: {
      beneficiaire: true,
      juridiction: true,
    },
  });
}
