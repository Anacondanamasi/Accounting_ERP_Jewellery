import type { UUID } from "./common";

export type MembershipStatus = "pending" | "active" | "suspended" | "revoked";
export type CompanyStatus = "active" | "suspended" | "trial" | "cancelled";

export interface UserProfile {
  id: UUID;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
}

export interface CompanySummary {
  id: UUID;
  name: string;
  logoUrl?: string | null;
  status: CompanyStatus;
  planName: string;
  role: string;
  membershipStatus: MembershipStatus;
  trialEndsAt?: string | null;
  permissions?: string[];
}

export interface UserMembershipSummary {
  companyId: UUID;
  companyName: string;
  companyStatus: CompanyStatus;
  role: string;
  membershipStatus: MembershipStatus;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  companies: CompanySummary[];
  activeCompanyId?: UUID | null;
}
