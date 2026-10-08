import { Router } from "express";
import {
  login,
  logout,
  me,
  refreshToken,
  register,
  resendVerification,
  verifyEmail,
  verifyMfa,
} from "../controllers/auth/identityController";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/auth/authController";
import { authMiddleware } from "../middleware/authMiddleware";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.get("/verify-email", verifyEmail);
authRoutes.post("/resend-verification", resendVerification);
authRoutes.post("/login", login);
authRoutes.post("/mfa/verify", verifyMfa);
authRoutes.post("/refresh", refreshToken);
authRoutes.post("/logout", logout);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.get("/me", authMiddleware, me);
