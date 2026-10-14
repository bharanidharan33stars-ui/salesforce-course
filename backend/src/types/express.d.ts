import type { Role } from "./domain";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by requireAuth / loadUser middleware. */
      user?: AuthenticatedUser;
      /** Browser-independent client address (respects trust proxy). */
      clientIp?: string;
    }
  }
}

export interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  emailVerifiedAt: string | null;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    csrfToken?: string;
  }
}

export {};
