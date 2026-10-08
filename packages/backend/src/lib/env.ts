import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "change-me",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY ?? "",
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY ?? "",
  FRONTEND_APP_URL: process.env.FRONTEND_APP_URL ?? "http://localhost:5173",
  REDIS_URL: process.env.REDIS_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
