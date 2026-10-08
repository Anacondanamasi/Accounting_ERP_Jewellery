import { z } from "zod";

const decimalMoney = z.coerce.number().multipleOf(0.01).nonnegative();
const decimalWeight = z.coerce.number().multipleOf(0.001).nonnegative();

export const invoiceLineSchema = z.object({
  sku: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  karat: z.enum(["24K", "22K", "18K", "14K", "SILVER", "PLATINUM"]),
  grossWt: decimalWeight,
  netWt: decimalWeight,
  stoneWt: decimalWeight,
  makingType: z.enum(["PER_GRAM", "FLAT", "PERCENT", "FIXED"]),
  makingRate: decimalMoney,
  ratePerGram: decimalMoney,
  discountPct: z.coerce.number().min(0).max(100),
  gstPct: z.coerce.number().min(0).max(28),
  hsnCode: z.string().min(1),
  huid: z.string().optional().nullable(),
});

export const invoiceFormSchema = z.object({
  invoiceDate: z.string().min(1),
  dueDate: z.string().min(1),
  customerId: z.coerce.number().min(1, "Customer is required"),
  salespersonId: z.coerce.number().optional().nullable(),

  placeOfSupply: z.string().min(1),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1, "At least one line item is required"),
});

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;
