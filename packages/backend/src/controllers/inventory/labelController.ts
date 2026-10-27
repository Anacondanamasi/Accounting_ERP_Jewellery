import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { generateLabelsPdf, LabelItemData, LabelPrintOptions } from "../../services/labelPdfService";
import { createPrimaryCodeForItem } from "./itemCodeController";

const printRequestSchema = z.object({
  templateCode: z.enum(["THERMAL_50X25", "THERMAL_38X25", "THERMAL_100X50", "A4_SHEET_3X8"]).default("THERMAL_50X25"),
  items: z.array(
    z.object({
      itemId: z.number().int().positive(),
      copies: z.number().int().positive().default(1),
    })
  ).min(1, "At least one item must be provided"),
  offsetXmm: z.number().optional().default(0),
  offsetYmm: z.number().optional().default(0),
  showPrice: z.boolean().optional().default(true),
  showWeight: z.boolean().optional().default(true),
  showKarat: z.boolean().optional().default(true),
  showHuid: z.boolean().optional().default(true),
});

export const printLabels = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const parsed = printRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: "Invalid print request", details: parsed.error.format() } });
  }

  const { templateCode, items: requestedItems, offsetXmm, offsetYmm, showPrice, showWeight, showKarat, showHuid } = parsed.data;

  // Retrieve company info
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, legalName: true },
  });

  if (!company) {
    return res.status(404).json({ error: { message: "Company not found" } });
  }

  const itemIds = requestedItems.map((i) => i.itemId);
  const copiesMap = new Map(requestedItems.map((i) => [i.itemId, i.copies]));

  // Retrieve items strictly scoped to company
  const dbItems = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
      companyId,
    },
    include: {
      codes: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      },
    },
  });

  if (dbItems.length === 0) {
    return res.status(404).json({ error: { message: "No matching items found for this company" } });
  }

  const labelItems: LabelItemData[] = [];
  let totalLabelCount = 0;

  for (const item of dbItems) {
    let primaryCode = item.codes[0]?.code;

    // If item has no code yet, generate one on the fly
    if (!primaryCode) {
      const newCodeRecord = await createPrimaryCodeForItem(companyId, item.id, actor);
      primaryCode = newCodeRecord.code;
    }

    const copies = copiesMap.get(item.id) || 1;
    totalLabelCount += copies;

    labelItems.push({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      karat: item.karat,
      grossWt: Number(item.grossWt || 0),
      netWt: Number(item.netWt || 0),
      huid: undefined,
      mrp: Number(item.mrp || 0),
      code: primaryCode,
      copies,
    });
  }

  const options: LabelPrintOptions = {
    templateCode,
    companyName: company.legalName || company.name,
    companyId: company.id,
    offsetXmm,
    offsetYmm,
    showPrice,
    showWeight,
    showKarat,
    showHuid,
  };

  const pdfBuffer = await generateLabelsPdf(labelItems, options);

  // Record audit job
  await prisma.labelPrintJob.create({
    data: {
      companyId,
      userId: actor,
      totalLabels: totalLabelCount,
      itemCount: labelItems.length,
      status: "COMPLETED",
      detailsJson: JSON.stringify({
        itemIds,
        templateCode,
        offsetXmm,
        offsetYmm,
      }),
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="labels_${templateCode.toLowerCase()}_${Date.now()}.pdf"`
  );
  return res.send(pdfBuffer);
};

export const getLabelTemplates = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  // Return standard presets
  const presets = [
    {
      code: "THERMAL_50X25",
      name: "Thermal 50×25 mm (Standard Jewellery Tag)",
      widthMm: 50,
      heightMm: 25,
      description: "Standard barcode/QR jewellery tag for thermal roll printers (TSC, Zebra, Citizen).",
      isDefault: true,
    },
    {
      code: "THERMAL_38X25",
      name: "Thermal 38×25 mm (Compact Tag)",
      widthMm: 38,
      heightMm: 25,
      description: "Compact tag for rings, earrings and delicate items.",
      isDefault: false,
    },
    {
      code: "THERMAL_100X50",
      name: "Thermal 100×50 mm (Retail Box / Parcel)",
      widthMm: 100,
      heightMm: 50,
      description: "Large label for boxes, trays, pouches and shipping packages.",
      isDefault: false,
    },
    {
      code: "A4_SHEET_3X8",
      name: "A4 Laser/Inkjet Sheet (3×8 = 24 Labels)",
      widthMm: 64,
      heightMm: 33.9,
      description: "Standard 24-up sticker sheet for standard office laser and inkjet printers (Avery 7160).",
      isDefault: false,
    },
  ];

  return res.json({ templates: presets });
};
