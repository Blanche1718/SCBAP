import type { NextFunction, Request, Response } from "express";
export declare function getObligationsByDossierController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createObligationController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getObligationByIdController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateObligationController(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function validateObligationController(req: Request, res: Response, next: NextFunction): Promise<void>;
