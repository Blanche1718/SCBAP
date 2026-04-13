import { CategorieObligationSchema, UpdateCategorieObligationSchema } from "../schemas/categorie-obligation.schema";
import { z } from "zod";
type CreateCategorieObligationInput = z.infer<typeof CategorieObligationSchema>;
type UpdateCategorieObligationInput = z.infer<typeof UpdateCategorieObligationSchema>;
export declare const DEFAULT_CATEGORIES_OBLIGATION: {
    nom: string;
    description: string;
}[];
export declare function getCategoriesObligation(): Promise<{
    nom: string;
    description: string | null;
    id: number;
}[]>;
export declare function getCategorieObligationById(id: number): Promise<{
    obligations: {
        type: string | null;
        description: string | null;
        id: number;
        statut: string | null;
        createdAt: Date;
        frequence: string | null;
        heure: Date | null;
        lieu: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        dossierId: number;
        categorieId: number;
        jourSemaine: string | null;
        statutStructuration: string | null;
        dateDebut: Date | null;
        dateFin: Date | null;
        beneficiaireId: number;
    }[];
} & {
    nom: string;
    description: string | null;
    id: number;
}>;
export declare function createCategorieObligation(input: CreateCategorieObligationInput): Promise<{
    nom: string;
    description: string | null;
    id: number;
}>;
export declare function updateCategorieObligation(id: number, input: UpdateCategorieObligationInput): Promise<{
    nom: string;
    description: string | null;
    id: number;
}>;
export declare function deleteCategorieObligation(id: number): Promise<{
    nom: string;
    description: string | null;
    id: number;
}>;
export declare function seedCategoriesObligation(): Promise<{
    createdCount: number;
    createdCategories: typeof DEFAULT_CATEGORIES_OBLIGATION;
}>;
export {};
