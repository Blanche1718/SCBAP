import type { NextFunction, Request, Response } from "express";
export declare function getDossiersController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function exportDossiersController(_req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getDossierByIdController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateDossierController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function softDeleteDossierController(req: Request, res: Response, next: NextFunction): Promise<void>;
