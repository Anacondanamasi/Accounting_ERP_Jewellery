import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../lib/apiResponse";
import { authMiddleware } from "../middleware/authMiddleware";
import { ensureCompanyDefaultAccounts } from "../lib/defaultAccounts";

export const accountRoutes = Router();
accountRoutes.use(authMiddleware);

const company = (req: any) => req.auth?.companyId as number;
const actor = (req: any) => String(req.auth?.userId ?? "system");

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  heading: z.enum(["ASSETS", "EQUITY", "EXPENSES", "LIABILITIES", "REVENUE"]).optional(),
  type: z.string().min(1, "Account type is required"),
  code: z.string().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  groupId: z.coerce.number().int().nonnegative().optional().nullable(),
  type: z.string().optional().nullable(),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  openingBalance: z.coerce.number().default(0),
  taxCode: z.string().optional().nullable(),
  taxTreatment: z.string().optional().nullable(),
  showOnDashboard: z.boolean().default(false),
  showInExpenseClaims: z.boolean().default(false),
  enablePayments: z.boolean().default(false),
  allowManualJournals: z.boolean().default(true),
  allowReconciliation: z.boolean().default(false),
  isBankAccount: z.boolean().default(false),
  isCashAccount: z.boolean().default(false),
  isControlAccount: z.boolean().default(false),
  cashFlowCategory: z.string().optional().nullable(),
  financialCategory: z.string().optional().nullable(),
  displayOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

const findGroup = (companyId: any, groupId: number) =>
  prisma.accountGroup.findFirst({
    where: {
      companyId,
      id: groupId,
      isActive: true,
    },
  });

accountRoutes.get("/", async (req, res) => {
  const companyId = company(req);
  await ensureCompanyDefaultAccounts(companyId, actor(req));
  const search = req.query.search ? String(req.query.search) : "";
  const type = req.query.type ? String(req.query.type) : "";
  const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
  const rows = await prisma.account.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
      ...(groupId ? { groupId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
              { group: { contains: search } },
            ],
          }
        : {}),
    },
    include: { accountGroup: true },
    orderBy: [{ group: "asc" }, { code: "asc" }],
  });
  return ok(res, rows);
});

accountRoutes.get("/groups", async (req, res) => {
  const companyId = company(req);
  await ensureCompanyDefaultAccounts(companyId, actor(req));
  const rows = await prisma.accountGroup.findMany({
    where: { companyId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return ok(res, rows);
});

accountRoutes.post("/groups", async (req, res) => {
  const companyId = company(req);
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid group payload", parsed.error.issues);
  
  const existing = await prisma.accountGroup.findFirst({
    where: { companyId, name: { equals: parsed.data.name } }
  });
  if (existing) return fail(res, 409, "ACCOUNT_GROUP_EXISTS", "Account group name already exists");

  const heading = parsed.data.heading || getHeadingForType(parsed.data.type);

  const row = await prisma.accountGroup.create({
    data: { ...parsed.data, heading, companyId, createdBy: actor(req) },
  });
  return created(res, row, "Account group created");
});

accountRoutes.put("/groups/:id", async (req, res) => {
  const companyId = company(req);
  const parsed = groupSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid group payload", parsed.error.issues);
  
  const id = Number(req.params.id);
  const existing = await prisma.accountGroup.findFirst({ where: { companyId, id } });
  if (!existing) return fail(res, 404, "ACCOUNT_GROUP_NOT_FOUND", "Account group not found");

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameConflict = await prisma.accountGroup.findFirst({
      where: { companyId, name: { equals: parsed.data.name } },
    });
    if (nameConflict) return fail(res, 409, "ACCOUNT_GROUP_EXISTS", "Account group name already in use");
  }

  const newHeading = parsed.data.heading || (parsed.data.type ? getHeadingForType(parsed.data.type) : existing.heading);

  const row = await prisma.accountGroup.update({
    where: { id },
    data: { ...parsed.data, heading: newHeading },
  });

  // cascade updates to accounts if heading or type changed
  if (newHeading !== existing.heading || 
      (parsed.data.type && parsed.data.type !== existing.type) ||
      (parsed.data.name && parsed.data.name !== existing.name)) {
    await prisma.account.updateMany({
      where: { companyId, groupId: id },
      data: {
        heading: newHeading,
        type: parsed.data.type || existing.type,
        group: parsed.data.name || existing.name,
      }
    });
  }

  return ok(res, row, "Account group updated");
});

accountRoutes.get("/:id", async (req, res) => {
  const companyId = company(req);
  const id = Number(req.params.id);
  const row = await prisma.account.findFirst({ where: { companyId, id }, include: { accountGroup: true } });
  if (!row) return fail(res, 404, "ACCOUNT_NOT_FOUND", "Account not found");
  return ok(res, row);
});

const getHeadingForType = (type: string) => {
  const map: Record<string, string> = {
    "Current Asset": "ASSETS", "Fixed Asset": "ASSETS", "Inventory": "ASSETS", "Non-current Asset": "ASSETS", "Prepayment": "ASSETS", "Bank": "ASSETS",
    "Equity": "EQUITY",
    "Depreciation": "EXPENSES", "Direct Costs": "EXPENSES", "Expense": "EXPENSES", "Overhead": "EXPENSES",
    "Current Liability": "LIABILITIES", "Liability": "LIABILITIES", "Non-current Liability": "LIABILITIES",
    "Other Income": "REVENUE", "Revenue": "REVENUE", "Sales": "REVENUE"
  };
  return map[type] || "EXPENSES";
};

accountRoutes.post("/", async (req, res) => {
  const companyId = company(req);
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("POST / accounts VALIDATION ERROR:", JSON.stringify(parsed.error.issues, null, 2), "BODY:", req.body);
    return fail(res, 400, "VALIDATION_ERROR", "Invalid account payload", parsed.error.issues);
  }
  
  let groupHeading = "EXPENSES";
  let groupType = parsed.data.type || "Expense";
  let groupName = "Ungrouped";
  let groupId = parsed.data.groupId || null;

  if (groupId) {
    const group = await findGroup(companyId, groupId);
    if (!group) return fail(res, 400, "ACCOUNT_GROUP_REQUIRED", "Select a valid account group");
    groupHeading = group.heading;
    groupType = group.type;
    groupName = group.name;
  } else if (parsed.data.type) {
    groupHeading = getHeadingForType(parsed.data.type);
    groupType = parsed.data.type;
  }

  if (parsed.data.code) {
    const codeConflict = await prisma.account.findFirst({
      where: { companyId, code: parsed.data.code }
    });
    if (codeConflict) return fail(res, 409, "ACCOUNT_EXISTS", "Account code already in use");
  }

  const row = await prisma.account.create({
    data: {
      ...parsed.data,
      groupId: groupId || null,
      companyId,
      heading: groupHeading,
      type: groupType,
      group: groupName,
      createdBy: actor(req),
    },
    include: { accountGroup: true },
  });
  return created(res, row, "Account created");
});

accountRoutes.put("/:id", async (req, res) => {
  const companyId = company(req);
  const parsed = accountSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    console.error("PUT / accounts VALIDATION ERROR:", JSON.stringify(parsed.error.issues, null, 2), "BODY:", req.body);
    return fail(res, 400, "VALIDATION_ERROR", "Invalid account payload", parsed.error.issues);
  }
  const id = Number(req.params.id);
  const existing = await prisma.account.findFirst({ where: { companyId, id } });
  if (!existing) return fail(res, 404, "ACCOUNT_NOT_FOUND", "Account not found");

  let updateData: any = { ...parsed.data };
  
  if (parsed.data.code && parsed.data.code !== existing.code) {
    const codeConflict = await prisma.account.findFirst({
      where: { companyId, code: parsed.data.code }
    });
    if (codeConflict) return fail(res, 409, "ACCOUNT_EXISTS", "Account code already in use");
  }

  if (parsed.data.groupId) {
    const group = await findGroup(companyId, parsed.data.groupId);
    if (!group) return fail(res, 400, "ACCOUNT_GROUP_REQUIRED", "Select a valid account group");
    
    if (existing.isControlAccount) {
      if (group.heading !== existing.heading || group.type !== existing.type) {
        return fail(res, 403, "RESTRICTED", "Control account headings and types cannot be changed.");
      }
    }
    updateData.heading = group.heading;
    updateData.type = group.type;
    updateData.group = group.name;
  } else if (parsed.data.type) {
    if (existing.isControlAccount && parsed.data.type !== existing.type) {
      return fail(res, 403, "RESTRICTED", "Control account headings and types cannot be changed.");
    }
    updateData.heading = getHeadingForType(parsed.data.type);
    updateData.type = parsed.data.type;
    updateData.groupId = null;
    updateData.group = "Ungrouped";
  }

  // If groupId was 0 or undefined, ensure it's set to null
  if (!updateData.groupId) {
    updateData.groupId = null;
  }

  if (existing.isControlAccount && parsed.data.isActive === false) {
    return fail(res, 403, "RESTRICTED", "Control accounts cannot be archived.");
  }

  const row = await prisma.account.update({
    where: { id: existing.id },
    data: updateData,
    include: { accountGroup: true },
  });
  return ok(res, row, "Account updated");
});

accountRoutes.delete("/:id", async (req, res) => {
  const companyId = company(req);
  const id = Number(req.params.id);
  const existing = await prisma.account.findFirst({ where: { companyId, id } });
  if (!existing) return fail(res, 404, "ACCOUNT_NOT_FOUND", "Account not found");

  if (existing.isControlAccount) {
    return fail(res, 403, "RESTRICTED", "Control accounts cannot be deleted.");
  }

  // Check if there are any journal entries (JournalLine) referencing this account
  const entriesCount = await prisma.journalLine.count({
    where: { companyId, accountId: id }
  });

  if (entriesCount > 0) {
    return fail(res, 400, "ACCOUNT_HAS_ENTRIES", "This account has accounting entries and cannot be deleted.");
  }

  await prisma.account.delete({ where: { id } });
  return ok(res, null, "Account deleted successfully");
});

