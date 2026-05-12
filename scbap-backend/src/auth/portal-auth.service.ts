import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import { sendServiceExterneAccessCodeEmail } from "../services/mail.service";
import { generateServiceAccessCode } from "../utils/service-externe-code";
import {
  APP_TIME_ZONE,
  buildDateInAppTimeZone,
  getTimeZoneDateParts,
} from "../utils/timezone";
import type {
  PortalAuthenticatedSession,
  PortalJwtPayload,
} from "./portal-auth.types";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || "10");
const PORTAL_AUTH_ERROR_MESSAGE =
  "Acces refuse. Verifiez les informations saisies.";

function getPortalJwtSecret() {
  const value =
    process.env.PORTAIL_JWT_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new Error(
      "PORTAIL_JWT_SECRET ou JWT_SECRET est manquant dans l'environnement",
    );
  }

  return value;
}

const PORTAL_JWT_SECRET = getPortalJwtSecret();
const PORTAL_JWT_EXPIRES_IN = process.env.PORTAIL_JWT_EXPIRES_IN || "24h";

type PortalAffectationRecord = {
  id: string;
  serviceId: string | null;
  beneficiaireId: string;
  obligationId: string | null;
  typeSuivi: string;
  libelleSuivi: string;
  codeSuivi: string;
  frequenceAttendue: string | null;
  lieuAttendu: string | null;
  modalitesConnues: boolean;
  statut: string;
  actif: boolean;
  service: {
    id: string;
    nom: string;
    type: string;
    email: string;
    telephone: string | null;
    actif: boolean;
    codeAccesHash: string;
  } | null;
  beneficiaire: {
    id: string;
    statut: string;
      dossier: {
        id: string;
        numeroDossier: string;
        numeroMandatDepot: string;
        juridictionId: string;
        nom: string;
        prenom: string;
      } | null;
  };
  obligation: {
    id: string;
    type: string | null;
    description: string | null;
    frequence: string | null;
    lieu: string | null;
    categorie: {
      id: string;
      nom: string;
    } | null;
  } | null;
};

function buildPortalAuthError() {
  return new HttpError(401, PORTAL_AUTH_ERROR_MESSAGE);
}

function getCurrentPortalMonthStart() {
  const parts = getTimeZoneDateParts(new Date(), APP_TIME_ZONE);

  return buildDateInAppTimeZone({
    year: parts.year,
    month: parts.month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildPortalSession(
  affectation: PortalAffectationRecord,
): PortalAuthenticatedSession {
  if (!affectation.service) {
    throw buildPortalAuthError();
  }

  return {
    affectationId: affectation.id,
    serviceId: affectation.service.id,
    beneficiaireId: affectation.beneficiaireId,
    obligationId: affectation.obligationId,
    codeSuivi: affectation.codeSuivi,
    typeSuivi: affectation.typeSuivi,
    libelleSuivi: affectation.libelleSuivi,
    frequenceAttendue: affectation.frequenceAttendue,
    lieuAttendu: affectation.lieuAttendu,
    modalitesConnues: affectation.modalitesConnues,
    statut: affectation.statut,
    service: {
      id: affectation.service.id,
      nom: affectation.service.nom,
      type: affectation.service.type,
      email: affectation.service.email,
      telephone: affectation.service.telephone,
    },
    beneficiaire: {
      id: affectation.beneficiaire.id,
      statut: affectation.beneficiaire.statut,
      dossier: affectation.beneficiaire.dossier
        ? {
            id: affectation.beneficiaire.dossier.id,
            numeroDossier: affectation.beneficiaire.dossier.numeroDossier,
            numeroMandatDepot:
              affectation.beneficiaire.dossier.numeroMandatDepot,
            juridictionId: affectation.beneficiaire.dossier.juridictionId,
            nom: affectation.beneficiaire.dossier.nom,
            prenom: affectation.beneficiaire.dossier.prenom,
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
          categorie: affectation.obligation.categorie
            ? {
                id: affectation.obligation.categorie.id,
                nom: affectation.obligation.categorie.nom,
              }
            : null,
        }
      : null,
    periodeCourante: formatDateOnly(getCurrentPortalMonthStart()),
  };
}

async function getPortalAffectationByCodeSuivi(codeSuivi: string) {
  const affectation = await prisma.affectationServiceExterne.findUnique({
    where: {
      codeSuivi: codeSuivi.trim().toUpperCase(),
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
              juridictionId: true,
              nom: true,
              prenom: true,
            },
          },
        },
      },
      obligation: {
        include: {
          categorie: true,
        },
      },
    },
  });

  if (!affectation || !affectation.actif) {
    throw buildPortalAuthError();
  }

  return affectation as PortalAffectationRecord;
}

function buildDefaultServiceName(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart ? `Service partenaire ${localPart}` : "Service partenaire";
}

export function signPortalAuthToken(session: PortalAuthenticatedSession) {
  const payload: PortalJwtPayload = {
    sub: session.serviceId,
    type: "portail",
    affectationId: session.affectationId,
    serviceId: session.serviceId,
    beneficiaireId: session.beneficiaireId,
    obligationId: session.obligationId,
  };

  return jwt.sign(payload, PORTAL_JWT_SECRET, {
    expiresIn: PORTAL_JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyPortalAuthToken(token: string) {
  return jwt.verify(token, PORTAL_JWT_SECRET) as unknown as PortalJwtPayload;
}

export async function requestPortalAccessCode(
  codeSuivi: string,
  email: string,
) {
  const affectation = await getPortalAffectationByCodeSuivi(codeSuivi);
  const normalizedEmail = email.trim().toLowerCase();
  const codeAcces = generateServiceAccessCode();
  const codeAccesHash = await bcrypt.hash(codeAcces, BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    let service = affectation.service;

    if (service) {
      if (!service.actif || service.email !== normalizedEmail) {
        throw buildPortalAuthError();
      }

      service = await tx.serviceExterne.update({
        where: {
          id: service.id,
        },
        data: {
          codeAccesHash,
        },
      });
    } else {
      const existingService = await tx.serviceExterne.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (existingService && !existingService.actif) {
        throw buildPortalAuthError();
      }

      service =
        existingService ??
        (await tx.serviceExterne.create({
          data: {
            nom: buildDefaultServiceName(normalizedEmail),
            type: "AUTRE",
            email: normalizedEmail,
            codeAccesHash,
          },
        }));

      if (existingService) {
        service = await tx.serviceExterne.update({
          where: {
            id: existingService.id,
          },
          data: {
            codeAccesHash,
          },
        });
      }

      await tx.affectationServiceExterne.update({
        where: {
          id: affectation.id,
        },
        data: {
          serviceId: service.id,
          statut: "ACTIVE",
        },
      });
    }

    return service;
  });

  await sendServiceExterneAccessCodeEmail({
    email: normalizedEmail,
    serviceNom: result.nom,
    codeAcces,
    beneficiaireNom: affectation.beneficiaire.dossier
      ? `${affectation.beneficiaire.dossier.prenom} ${affectation.beneficiaire.dossier.nom}`.trim()
      : null,
    libelleSuivi: affectation.libelleSuivi,
    context: "PORTAL_LOGIN",
  });

  return {
    status: "CODE_SENT",
    email: normalizedEmail,
  };
}

export async function authenticatePortalAccess(
  codeSuivi: string,
  codeService: string,
) {
  const affectation = await getPortalAffectationByCodeSuivi(codeSuivi);

  if (!affectation.service || !affectation.service.actif) {
    throw buildPortalAuthError();
  }

  const valid = await bcrypt.compare(
    codeService.trim(),
    affectation.service.codeAccesHash,
  );

  if (!valid) {
    throw buildPortalAuthError();
  }

  const session = buildPortalSession(affectation);

  return {
    token: signPortalAuthToken(session),
    session,
  };
}

export async function getPortalSessionByAffectationId(affectationId: string) {
  const affectation = await prisma.affectationServiceExterne.findUnique({
    where: {
      id: affectationId,
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
              juridictionId: true,
              nom: true,
              prenom: true,
            },
          },
        },
      },
      obligation: {
        include: {
          categorie: true,
        },
      },
    },
  });

  if (!affectation || !affectation.actif) {
    throw buildPortalAuthError();
  }

  return buildPortalSession(affectation as PortalAffectationRecord);
}
