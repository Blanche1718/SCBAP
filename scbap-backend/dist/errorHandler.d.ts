import type { NextFunction, Request, Response } from "express";
export declare class HttpError extends Error {
    readonly statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): Response<any, Record<string, any>>;
