import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import {
  createJournalEntry,
  createJournalTemplate,
  deleteJournalTemplate,
  getJournalEntryById,
  listJournalEntries,
  listJournalTemplates,
  postJournalEntry,
  reverseJournalEntry,
  updateJournalEntry,
} from "../controllers/journal/journalController";

export const journalRoutes = Router();
journalRoutes.use(authMiddleware);

journalRoutes.get("/", listJournalEntries);
journalRoutes.get("/templates", listJournalTemplates);
journalRoutes.post("/templates", requirePermission("journal.create"), createJournalTemplate);
journalRoutes.delete("/templates/:id", requirePermission("journal.update"), deleteJournalTemplate);
journalRoutes.get("/:id", getJournalEntryById);
journalRoutes.post("/", requirePermission("journal.create"), createJournalEntry);
journalRoutes.put("/:id", requirePermission("journal.update"), updateJournalEntry);
journalRoutes.post("/:id/post", requirePermission("journal.post"), postJournalEntry);
journalRoutes.post("/:id/reverse", requirePermission("journal.post"), reverseJournalEntry);
