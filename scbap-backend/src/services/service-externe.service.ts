import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import {
  type CreateAffectationServiceExterneInput,
  type CreateServiceExterneInput,
  type UpdateServiceExterneInput,
} from "../schemas/service-externe.schema";
import { sendServiceExterneAccessCodeEmail } from "./mail.service";
import {
  generateCodeSuivi,
  generateServiceAccessCode,
} from "../utils/service-externe-code";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || "10");

type ServiceExterneListRecord = {
  id: string;
  nom: string;
  type: string;
  email: string;
  telephone: string | null;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
  affectations: Array<{
    actif: boolean;
  }>;
  _count: {
    evaluations: number;
  };
};

type AffectationRecord = {
  id: string;
  serviceId: string | null;
  beneficiaireId: string;
  obligationId: string | null;
  typeSuivi: string;
  libelleSuivi: string;
  codeSuivi: string;
  frequenceAttendue: string | null;
  lieuAttendu: string | null;
  horairesAttendus: Prisma.JsonValue | null;
  modalitesConnues: boolean;
  statut: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
  service: {
    id: string;
    nom: string;
    type: string;
    email: string;
    telephone: string | null;
    actif: boolean;
  } | null;
  beneficiaire: {
    id: string;
    statut: string;
    dossier: {
      id: string;
      numeroDossier: string;
      numeroMandatDepot: string;
      nom: string;
      prenom: string;
      juridictionId: string | null;
    } | null;
  };
  obligation: {
    id: string;
    type: string | null;
    description: string | null;
    frequence: string | null;
    lieu: string | null;
    heure: Date | null;
    categorie: {
      id: string;
      nom: string;
    } | null;
  } | null;
  _count: {
    evaluations: number;
  };
};

type ServiceExterneDetailRecord = Omit<ServiceExterneListRecord, "affectations"> & {
  affectations: AffectationRecord[];
};

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function mapServiceExterne(service: ServiceExterneListRecord) {
  const activeAffectations = service.affectations.filter(
    (affectation) => affectation.actif,
  ).length;

  return {
    id: service.id,
    nom: service.nom,
    type: service.type,
    email: service.email,
    telephone: service.telephone,
    actif: service.actif,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    stats: {
      affectationsTotal: service.affectations.length,
      affectationsActives: activeAffectations,
      evaluationsTotal: service._count.evaluations,
    },
  };
}

function mapAffectation(affectation: AffectationRecord) {
  return {
    id: affectation.id,
    serviceId: affectation.serviceId,
    beneficiaireId: affectation.beneficiaireId,
    obligationId: affectation.obligationId,
    typeSuivi: affectation.typeSuivi,
    libelleSuivi: affectation.libelleSuivi,
    codeSuivi: affectation.codeSuivi,
    frequenceAttendue: affectation.frequenceAttendue,
    lieuAttendu: affectation.lieuAttendu,
    horairesAttendus: affectation.horairesAttendus,
    modalitesConnues: affectation.modalitesConnues,
    statut: affectation.statut,
    actif: affectation.actif,
    createdAt: affectation.createdAt.toISOString(),
    updatedAt: affectation.updatedAt.toISOString(),
    service: affectation.service
      ? {
          id: affectation.service.id,
          nom: affectation.service.nom,
          type: affectation.service.type,
          email: affectation.service.email,
          telephone: affectation.service.telephone,
          actif: affectation.service.actif,
        }
      : null,
    beneficiaire: {
      id: affectation.beneficiaire.id,
      statut: affectation.beneficiaire.statut,
      dossier: affectation.beneficiaire.dossier
        ? {
            id: affectation.beneficiaire.dossier.id,
            numeroDossier: affectation.beneficiaire.dossier.numeroDossier,
            numeroMandatDepot:
              affectation.beneficiaire.dossier.numeroMandatDepot,
            nom: affectation.beneficiaire.dossier.nom,
            prenom: affectation.beneficiaire.dossier.prenom,
            juridictionId: affectation.beneficiaire.dossier.juridictionId,
          }
        : null,
    },
    obligation: affectation.obligation
      ? {
          id: affectation.obligation.id,
          type: affectation.obligation.type,
          description: affectation.obligation.description,
          frequence: affectation.obligation.frequence,
          lieu: affectation.obligation.lieu,
          heure: affectation.obligation.heure
            ? affectation.obligation.heure.toISOString()
            : null,
          categorie: affectation.obligation.categorie
            ? {
                id: affectation.obligation.categorie.id,
                nom: affectation.obligation.categorie.nom,
              }
            : null,
        }
      : null,
    stats: {
      evaluationsTotal: affectation._count.evaluations,
    },
  };
}

async function assertUniqueServiceExterneEmail(email: string, excludeId?: string) {
  const existing = await prisma.serviceExterne.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, "Un service externe existe deja avec cet email");
  }
}

async function generateUniqueCodeSuivi() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const codeSuivi = generateCodeSuivi();
    const existing = await prisma.affectationServiceExterne.findUnique({
      where: {
        codeSuivi,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return codeSuivi;
    }
  }

  throw new HttpError(
    500,
    "Impossible de generer un code de suivi unique pour le moment",
  );
}

async function getServiceExterneRecord(serviceId: string) {
  const service = await prisma.serviceExterne.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new HttpError(404, "Service externe introuvable");
  }

  return service;
}

async function getBeneficiaireRecord(beneficiaireId: string) {
  const beneficiaire = await prisma.beneficiaire.findUnique({
    where: { id: beneficiaireId },
    include: {
      dossier: {
        select: {
          id: true,
          numeroDossier: true,
          numeroMandatDepot: true,
          nom: true,
          prenom: true,
          juridictionId: true,
        },
      },
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  return beneficiaire;
}

async function getObligationRecord(obligationId: string, beneficiaireId: string) {
  const obligation = await prisma.obligation.findUnique({
    where: {
      id: obligationId,
    },
    include: {
      categorie: true,
    },
  });

  if (!obligation) {
    throw new HttpError(404, "Obligation introuvable");
  }

  if (obligation.beneficiaireId !== beneficiaireId) {
    throw new HttpError(
      409,
      "Cette obligation n'appartient pas au beneficiaire selectionne",
    );
  }

  return obligation;
}

export async function createServiceExterne(input: CreateServiceExterneInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  await assertUniqueServiceExterneEmail(normalizedEmail);

  const codeAccesInitial = generateServiceAccessCode();
  const codeAccesHash = await bcrypt.hash(codeAccesInitial, BCRYPT_ROUNDS);

  const service = await prisma.serviceExterne.create({
    data: {
      nom: input.nom.trim(),
      type: input.type,
      email: normalizedEmail,
      telephone: input.telephone?.trim() || null,
      codeAccesHash,
    },
    include: {
      affectations: {
        select: {
          actif: true,
        },
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  const notification = await sendServiceExterneAccessCodeEmail({
    email: normalizedEmail,
    serviceNom: service.nom,
    codeAcces: codeAccesInitial,
    context: "SERVICE_SETUP",
  });

  return {
    service: mapServiceExterne(service),
    codeAccesInitial,
    notification,
  };
}

export async function resetServiceAccessCode(serviceId: string) {
  const service = await getServiceExterneRecord(serviceId);
  const codeAccesInitial = generateServiceAccessCode();
  const codeAccesHash = await bcrypt.hash(codeAccesInitial, BCRYPT_ROUNDS);

  const updatedService = await prisma.serviceExterne.update({
    where: { id: serviceId },
    data: { codeAccesHash },
  });

  const notification = await sendServiceExterneAccessCodeEmail({
    email: updatedService.email,
    serviceNom: updatedService.nom,
    codeAcces: codeAccesInitial,
    context: "SERVICE_SETUP",
  });

  return { codeAccesInitial, notification };
}

export async function updateServiceExterne(serviceId: string, input: UpdateServiceExterneInput) {
  await getServiceExterneRecord(serviceId);

  const normalizedEmail = input.email.trim().toLowerCase();
  await assertUniqueServiceExterneEmail(normalizedEmail, serviceId);

  const service = await prisma.serviceExterne.update({
    where: { id: serviceId },
    data: {
      nom: input.nom.trim(),
      type: input.type,
      email: normalizedEmail,
      telephone: input.telephone?.trim() || null,
      actif: input.actif,
    },
    include: {
      affectations: {
        select: {
          actif: true,
        },
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  return mapServiceExterne(service);
}

export async function listServicesExternes() {
  const services = await prisma.serviceExterne.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
    include: {
      affectations: {
        select: {
          actif: true,
        },
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  return services.map((service) => mapServiceExterne(service));
}

export async function getServiceExterneById(serviceId: string) {
  const service = await prisma.serviceExterne.findUnique({
    where: {
      id: serviceId,
    },
    include: {
      affectations: {
        orderBy: [{ actif: "desc" }, { createdAt: "desc" }],
        include: {
          service: true,
          beneficiaire: {
            include: {
              dossier: {
                select: {
                  id: true,
                  numeroDossier: true,
                  numeroMandatDepot: true,
                  nom: true,
                  prenom: true,
                  juridictionId: true,
                },
              },
            },
          },
          obligation: {
            include: {
              categorie: true,
            },
          },
          _count: {
            select: {
              evaluations: true,
            },
          },
        },
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  if (!service) {
    throw new HttpError(404, "Service externe introuvable");
  }

  const detail = service as ServiceExterneDetailRecord;
  const activeAffectations = detail.affectations.filter(
    (affectation) => affectation.actif,
  ).length;

  return {
    id: detail.id,
    nom: detail.nom,
    type: detail.type,
    email: detail.email,
    telephone: detail.telephone,
    actif: detail.actif,
    createdAt: detail.createdAt.toISOString(),
    updatedAt: detail.updatedAt.toISOString(),
    stats: {
      affectationsTotal: detail.affectations.length,
      affectationsActives: activeAffectations,
      evaluationsTotal: detail._count.evaluations,
    },
    affectations: detail.affectations.map((affectation) =>
      mapAffectation(affectation),
    ),
  };
}

export async function createAffectationServiceExterne(
  input: CreateAffectationServiceExterneInput,
) {
  const service = input.serviceId
    ? await getServiceExterneRecord(input.serviceId)
    : null;
  const beneficiaire = await getBeneficiaireRecord(input.beneficiaireId);

  const obligation = input.obligationId
    ? await getObligationRecord(input.obligationId, beneficiaire.id)
    : null;

  if (service && obligation) {
    const existing = await prisma.affectationServiceExterne.findFirst({
      where: {
        serviceId: service.id,
        beneficiaireId: beneficiaire.id,
        obligationId: obligation.id,
        actif: true,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new HttpError(
        409,
        "Une affectation active existe deja pour ce service et cette obligation",
      );
    }
  }

  const codeSuivi = await generateUniqueCodeSuivi();
  const horairesAttendus =
    input.horairesAttendus === undefined
      ? undefined
      : input.horairesAttendus === null
        ? Prisma.JsonNull
        : (input.horairesAttendus as Prisma.InputJsonValue);

  const affectation = await prisma.affectationServiceExterne.create({
    data: {
      serviceId: service?.id || null,
      beneficiaireId: beneficiaire.id,
      obligationId: obligation?.id || null,
      typeSuivi: input.typeSuivi.trim(),
      libelleSuivi: input.libelleSuivi.trim(),
      codeSuivi,
      frequenceAttendue: input.frequenceAttendue?.trim() || null,
      lieuAttendu: input.lieuAttendu?.trim() || null,
      ...(horairesAttendus !== undefined
        ? {
            horairesAttendus,
          }
        : {}),
      modalitesConnues: input.modalitesConnues ?? false,
      statut: service ? "ACTIVE" : "EN_ATTENTE",
      actif: true,
    },
    include: {
      service: true,
      beneficiaire: {
        include: {
          dossier: {
            select: {
              id: true,
              numeroDossier: true,
              numeroMandatDepot: true,
              nom: true,
              prenom: true,
              juridictionId: true,
            },
          },
        },
      },
      obligation: {
        include: {
          categorie: true,
        },
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  // Envoi du code d'accès au service lors de l'affectation
  /* if (affectation.service) {
    const codeAccesInitial = generateServiceAccessCode();
    const codeAccesHash = await bcrypt.hash(codeAccesInitial, BCRYPT_ROUNDS);

    await prisma.serviceExterne.update({
      where: { id: affectation.service.id },
      data: { codeAccesHash },
    });

    await sendServiceExterneAccessCodeEmail({
      email: affectation.service.email,
      serviceNom: affectation.service.nom,
      codeAcces: codeAccesInitial,
      beneficiaireNom: beneficiaire.dossier ? `${beneficiaire.dossier.nom} ${beneficiaire.dossier.prenom}` : null,
      libelleSuivi: affectation.libelleSuivi,
      context: "PORTAL_LOGIN",
    });
  } */

  return mapAffectation(affectation);
}
