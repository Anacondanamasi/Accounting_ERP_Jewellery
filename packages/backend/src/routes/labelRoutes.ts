import { Router } from "express";
import { printLabels, getLabelTemplates } from "../controllers/inventory/labelController";

export const labelRoutes = Router();

labelRoutes.get("/templates", getLabelTemplates);
labelRoutes.post("/print", printLabels);
