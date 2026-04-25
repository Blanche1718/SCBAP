import { CategorieObligationSchema, UpdateCategorieObligationSchema } from "../schemas/categorie-obligation.schema";
import { z } from "zod";
type CreateCategorieObligationInput = z.infer<typeof CategorieObligationSchema>;
type UpdateCategorieObligationInput = z.infer<typeof UpdateCategorieObligationSchema>;
export declare const DEFAULT_CATEGORIES_OBLIGATION: {
    nom: string;
    description: string;
}[];
export declare function getCategoriesObligation(): Promise<{
    id: string;
    nom: string;
    description: string | null;
}[]>;
export declare function getCategorieObligationById(id: string): Promise<{
    obligations: {
        type: string | null;
        id: string;
        statut: string | null;
        createdAt: Date;
        description: string | null;
        dossierId: string;
        frequence: string | null;
        heure: Date | null;
        lieu: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        beneficiaireId: string;
        categorieId: string;
        source: string | null;
        jourSemaine: string | null;
        statutStructuration: string | null;
        dateDebut: Date | null;
        dateFin: Date | null;
        raisonModification: string | null;
        raisonAutre: string | null;
        modifieLe: Date | null;
        modifiePar: string | null;
    }[];
} & {
    id: string;
    nom: string;
    description: string | null;
}>;
export declare function createCategorieObligation(input: CreateCategorieObligationInput): Promise<{
    id: string;
    nom: string;
    description: string | null;
}>;
export declare function updateCategorieObligation(id: string, input: UpdateCategorieObligationInput): Promise<{
    id: string;
    nom: string;
    description: string | null;
}>;
export declare function deleteCategorieObligation(id: string): Promise<{
    id: string;
    nom: string;
    description: string | null;
}>;
export declare function seedCategoriesObligation(): Promise<{
    createdCount: number;
    createdCategories: typeof DEFAULT_CATEGORIES_OBLIGATION;
}>;
export {};
