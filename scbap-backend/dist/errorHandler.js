"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const logger_1 = require("./logger");
class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "HttpError";
    }
}
exports.HttpError = HttpError;
function errorHandler(error, req, res, _next) {
    const statusCode = error instanceof HttpError
        ? error.statusCode
        : error instanceof zod_1.ZodError
            ? 400
            : error instanceof client_1.Prisma.PrismaClientKnownRequestError
                ? 400
                : 500;
    logger_1.logger[statusCode >= 500 ? "error" : "warn"]("Request failed", {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        error: logger_1.logger.serializeError(error),
    });
    if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Donnees invalides",
            errors: error.flatten(),
        });
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
            return res.status(409).json({
                message: "Operation impossible car cette ressource est encore utilisee ailleurs",
                meta: error.meta,
            });
        }
        if (error.code === "P2025") {
            return res.status(404).json({
                message: "Ressource introuvable",
                meta: error.meta,
            });
        }
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "Une ressource avec cette valeur unique existe deja",
                meta: error.meta,
            });
        }
        return res.status(400).json({
            message: "Erreur Prisma",
            code: error.code,
            meta: error.meta,
        });
    }
    if (error instanceof Error) {
        return res.status(500).json({
            message: error.message,
        });
    }
    return res.status(500).json({
        message: "Erreur interne du serveur",
    });
}
