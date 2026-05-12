import type { Prisma } from "@prisma/client";

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    role: true;
    structure: true;
  };
}>;

export type AuthenticatedUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  statut: string;
  createdAt: string;
  role: {
    id: string;
    nom: string;
  };
  structure: {
    id: string;
    nom: string;
    code: string;
    type: string;
    juridiction?: string | null;
  };
};

export type JwtAuthPayload = {
  sub: string;
  email: string;
  role: string;
  structureId: string;
  sessionVersion: number;
};
