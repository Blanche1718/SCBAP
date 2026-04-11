import { z } from "zod";
export declare const CreateObligationSchema: z.ZodObject<{
    categorie_id: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    frequence: z.ZodOptional<z.ZodString>;
    jour_semaine: z.ZodOptional<z.ZodString>;
    heure: z.ZodOptional<z.ZodString>;
    lieu: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    statut_structuration: z.ZodOptional<z.ZodEnum<{
        NON_STRUCTUREE: "NON_STRUCTUREE";
        A_VERIFIER: "A_VERIFIER";
        VALIDE: "VALIDE";
    }>>;
    date_debut: z.ZodOptional<z.ZodString>;
    date_fin: z.ZodOptional<z.ZodString>;
    statut: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UpdateObligationSchema: z.ZodObject<{
    categorie_id: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    frequence: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    jour_semaine: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    heure: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    lieu: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    statut_structuration: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        NON_STRUCTUREE: "NON_STRUCTUREE";
        A_VERIFIER: "A_VERIFIER";
        VALIDE: "VALIDE";
    }>>>;
    date_debut: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    date_fin: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    statut: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const ValidateObligationSchema: z.ZodObject<{
    categorie_id: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    frequence: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    jour_semaine: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    heure: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    lieu: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    statut_structuration: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        NON_STRUCTUREE: "NON_STRUCTUREE";
        A_VERIFIER: "A_VERIFIER";
        VALIDE: "VALIDE";
    }>>>;
    date_debut: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    date_fin: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    statut: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
