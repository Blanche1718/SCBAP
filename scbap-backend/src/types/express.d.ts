import type { AuthenticatedUser } from "../auth/auth.types";
import type { PortalAuthenticatedSession } from "../auth/portal-auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      portalSession?: PortalAuthenticatedSession;
    }
  }
}

export {};
