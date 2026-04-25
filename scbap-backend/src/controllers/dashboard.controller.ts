import type { Request, Response, NextFunction } from "express";
import {
  getDashboardStats,
  getRecentEvents,
  getComplianceByWeek,
  getComplianceTrend30Days,
} from "../services/dashboard.service";

function parseJurisdictionParam(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getDashboardStatsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await getDashboardStats(req.user, parseJurisdictionParam(req.query.juridiction));
    res.status(200).json({
      message: "Statistiques du dashboard récupérées",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardEventsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const events = await getRecentEvents(req.user, parseJurisdictionParam(req.query.juridiction));
    res.status(200).json({
      message: "Événements récents récupérés",
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardComplianceController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const compliance = await getComplianceByWeek(req.user, parseJurisdictionParam(req.query.juridiction));
    res.status(200).json({
      message: "Données de conformité récupérées",
      data: compliance,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardComplianceTrendController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const compliance = await getComplianceTrend30Days(req.user, parseJurisdictionParam(req.query.juridiction));
    res.status(200).json({
      message: "Tendance de conformité récupérée",
      data: compliance,
    });
  } catch (error) {
    next(error);
  }
}
