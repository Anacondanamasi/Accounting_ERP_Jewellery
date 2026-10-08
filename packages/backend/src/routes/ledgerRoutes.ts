import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getGeneralLedger } from "../controllers/ledger/ledgerController";

export const ledgerRoutes = Router();
ledgerRoutes.use(authMiddleware);
ledgerRoutes.get("/", getGeneralLedger);
