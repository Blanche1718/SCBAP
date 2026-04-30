import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new HttpError(400, `Identifiant de ${label} invalide`);
  }

  return value;
}

function parsePaginationParam(
  value: unknown,
  paramName: string,
  defaultValue: number,
) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `Le parametre "${paramName}" est invalide`);
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(400, `Le parametre "${paramName}" doit etre un entier positif`);
  }

  return parsedValue;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Le parametre de filtre est invalide");
  }

  return value.trim() || undefined;
}

function parseLuFilter(value: unknown) {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    return undefined;
  }

  const normalized = parsed.toUpperCase();
  if (normalized === "LUS" || normalized === "NON_LUS" || normalized === "TOUS") {
    return normalized;
  }

  throw new HttpError(400, "Le parametre \"lu\" est invalide");
}

export async function getNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parsePaginationParam(req.query.page, "page", 1);
    const limit = parsePaginationParam(req.query.limit, "limit", 10);
    const search = parseOptionalString(req.query.search);
    const type = parseOptionalString(req.query.type);
    const priorite = parseOptionalString(req.query.priorite);
    const luFilter = parseLuFilter(req.query.lu);
    const jurisdiction = parseOptionalString(req.query.juridiction);

    const notifications = await getNotifications(
      page,
      limit,
      {
        search,
        type,
        priorite,
        lu: luFilter === "TOUS" ? undefined : luFilter,
        jurisdiction,
      },
      req.user,
    );

    res.status(200).json({
      message: "Liste des notifications recuperee avec succes",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsReadController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseUuid(req.params.id, "notification");
    const notification = await markNotificationAsRead(id, req.user);

    res.status(200).json({
      message: "Notification marquée comme lue",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsAsReadController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search = parseOptionalString(req.query.search);
    const priorite = parseOptionalString(req.query.priorite);
    const type = parseOptionalString(req.query.type);
    const luFilter = parseLuFilter(req.query.lu);
    const jurisdiction = parseOptionalString(req.query.juridiction);

    const result = await markAllNotificationsAsRead(
      {
        search,
        priorite,
        type,
        lu: luFilter === "TOUS" ? undefined : luFilter,
        jurisdiction,
      },
      req.user,
    );

    res.status(200).json({
      message: "Toutes les notifications ont ete marquees comme lues",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
