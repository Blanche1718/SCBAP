import type { Request, Response, NextFunction } from "express";
import {
  getDashboardStats,
  getRecentEvents,
  getComplianceByWeek,
} from "../services/dashboard.service";

export async function getDashboardStatsController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({
      message: "Statistiques du dashboard récupérées",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardEventsController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const events = await getRecentEvents();
    res.status(200).json({
      message: "Événements récents récupérés",
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardComplianceController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const compliance = await getComplianceByWeek();
    res.status(200).json({
      message: "Données de conformité récupérées",
      data: compliance,
    });
  } catch (error) {
    next(error);
  }
}
