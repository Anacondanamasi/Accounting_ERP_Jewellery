const { z } = require("zod");

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  heading: z.enum(["ASSETS", "EQUITY", "EXPENSES", "LIABILITIES", "REVENUE"]).optional(),
  type: z.string().min(1, "Account type is required"),
  code: z.string().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

const payload1 = {
  name: "Test Bank Group",
  type: "Bank",
  code: "",
  isActive: true
};

const result1 = groupSchema.safeParse(payload1);
if (!result1.success) {
  console.log("Error 1:", result1.error.issues);
} else {
  console.log("Success 1");
}
