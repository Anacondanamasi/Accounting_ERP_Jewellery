import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "./env";

const hasAsymmetricKeys = Boolean(env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY);
const signingAlgorithm: jwt.Algorithm = hasAsymmetricKeys ? "RS256" : "HS256";
const signingKey = hasAsymmetricKeys ? env.JWT_PRIVATE_KEY : env.JWT_SECRET;
const verificationKey = hasAsymmetricKeys ? env.JWT_PUBLIC_KEY : env.JWT_SECRET;

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 60 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const BCRYPT_COST = 12;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signAccessToken = (payload: {
  sub: string;
  role: string;
  companyId: string | null;
  legacyCompanyId: number | null;
}) =>
  jwt.sign(payload, signingKey, {
    algorithm: signingAlgorithm,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, verificationKey, {
      algorithms: [signingAlgorithm],
    }) as jwt.JwtPayload & {
      sub: string;
      role: string;
      companyId: string | null;
      legacyCompanyId: number | null;
    };
  } catch {
    // Backward-compat fallback: accept HS256 tokens signed with JWT_SECRET.
    // Useful during local/dev migrations when algorithm configuration changes.
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload & {
      sub: string;
      role: string;
      companyId: string | null;
      legacyCompanyId: number | null;
    };
  }
};

export const createRefreshToken = () => crypto.randomBytes(48).toString("hex");
export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createSignedToken = (payload: Record<string, unknown>, expiresIn: string) =>
  jwt.sign(payload, signingKey, { algorithm: signingAlgorithm, expiresIn: expiresIn as any });

export const verifySignedToken = <T>(token: string) =>
  jwt.verify(token, verificationKey, { algorithms: [signingAlgorithm] }) as jwt.JwtPayload & T;
