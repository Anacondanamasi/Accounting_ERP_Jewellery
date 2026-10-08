import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createKarigar,
  listKarigars,
  updateKarigar,
} from "../controllers/inventory/karigarController";

export const karigarRoutes = Router();
karigarRoutes.use(authMiddleware);

karigarRoutes.get("/", listKarigars);
karigarRoutes.post("/", createKarigar);
karigarRoutes.put("/:id", updateKarigar);
