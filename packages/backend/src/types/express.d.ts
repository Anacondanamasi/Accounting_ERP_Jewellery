import "express";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string | number;
        companyId: string | number | null;
        legacyCompanyId: number | null;
        role: string;
      };
      companyContext?: {
        company: {
          id: string;
          name: string;
          status: "active" | "suspended" | "trial" | "cancelled";
          legacyCompanyId: number | null;
        };
        membership: {
          id: string;
          status: "pending" | "active" | "suspended" | "revoked";
        };
        role: {
          id: string;
          name: string;
          isSystemRole: boolean;
        };
        permissions: string[];
      };
    }
  }
}

export {};
