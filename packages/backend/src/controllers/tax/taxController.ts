import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

export const STATE_CODES: Record<string, string> = {
  "jammu & kashmir": "01",
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "dadra & nagar haveli and daman & diu": "26",
  "maharashtra": "27",
  "andhra pradesh": "37",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman & nicobar islands": "35",
  "telangana": "36",
  "ladakh": "38",
};

export const getStateCode = (gstinOrState?: string | null): string => {
  if (!gstinOrState) return "";
  const s = gstinOrState.trim();
  if (/^\d{2}[A-Z0-9]{13}$/i.test(s)) {
    return s.substring(0, 2);
  }
  return STATE_CODES[s.toLowerCase()] || "";
};

const getPeriodDates = (query: any) => {
  const year = Number(query.year) || new Date().getFullYear();
  if (query.quarter) {
    const q = String(query.quarter).toUpperCase();
    if (q === "Q1") return { from: new Date(year, 3, 1), to: new Date(year, 6, 1), fp: `06${year}`, periodLabel: `Q1 (Apr–Jun ${year})` };
    if (q === "Q2") return { from: new Date(year, 6, 1), to: new Date(year, 9, 1), fp: `09${year}`, periodLabel: `Q2 (Jul–Sep ${year})` };
    if (q === "Q3") return { from: new Date(year, 9, 1), to: new Date(year, 12, 1), fp: `12${year}`, periodLabel: `Q3 (Oct–Dec ${year})` };
    if (q === "Q4") return { from: new Date(year + 1, 0, 1), to: new Date(year + 1, 3, 1), fp: `03${year + 1}`, periodLabel: `Q4 (Jan–Mar ${year + 1})` };
  }
  const month = Number(query.month) || (new Date().getMonth() + 1);
  const fpMonth = String(month).padStart(2, "0");
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 1),
    fp: `${fpMonth}${year}`,
    periodLabel: `${fpMonth}/${year}`,
  };
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const calculateItcSetOff = (
  liability: { igst: number; cgst: number; sgst: number },
  credit: { igst: number; cgst: number; sgst: number }
) => {
  const due = { igst: round2(liability.igst), cgst: round2(liability.cgst), sgst: round2(liability.sgst) };
  const left = { igst: round2(credit.igst), cgst: round2(credit.cgst), sgst: round2(credit.sgst) };
  const used = { igst: 0, cgst: 0, sgst: 0 };

  const pay = (from: "igst" | "cgst" | "sgst", to: "igst" | "cgst" | "sgst", cap = Infinity) => {
    const amt = Math.min(left[from], due[to], cap);
    if (amt <= 0) return;
    left[from] = round2(left[from] - amt);
    due[to] = round2(due[to] - amt);
    used[to] = round2(used[to] + amt);
  };

  // GST Law (Section 49 & Rule 88A) set-off order:
  pay("igst", "igst");
  pay("igst", "cgst", Math.max(0, due.cgst - left.cgst));
  pay("igst", "sgst", Math.max(0, due.sgst - left.sgst));
  pay("igst", "cgst");
  pay("igst", "sgst");
  pay("cgst", "cgst");
  pay("cgst", "igst");
  pay("sgst", "sgst");
  pay("sgst", "igst");

  return { payable: due, used, carry: left };
};

const hsnCreateSchema = z.object({
  code: z.string().min(4).max(8),
  description: z.string().min(3),
  gstRate: z.coerce.number().min(0).max(28),
  cessRate: z.coerce.number().min(0).max(28).default(0),
  isActive: z.boolean().optional().default(true),
});

const hsnUpdateSchema = hsnCreateSchema.partial();

export const getGstr1 = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const sellerGstin = company?.gstin || "";
  const sellerStateCode = getStateCode(sellerGstin || company?.state);

  const { from, to, fp, periodLabel } = getPeriodDates(req.query);

  const [invoices, notes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["POSTED", "APPROVED", "PAID"] },
        date: { gte: from, lt: to },
      },
      include: { customer: true, lines: true },
      orderBy: { date: "asc" },
    }),
    prisma.noteDocument.findMany({
      where: {
        companyId,
        status: { not: "VOID" },
        date: { gte: from, lt: to },
      },
      include: { customer: true, supplier: true, lines: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Separate B2B, B2C Large, B2C Small
  const b2bRows: any[] = [];
  const b2clRows: any[] = [];
  const b2csMap = new Map<string, { pos: string; supplyType: string; rate: number; taxableValue: number; cgst: number; sgst: number; igst: number; count: number }>();
  const hsnMap = new Map<string, { hsnCode: string; description: string; uqc: string; qty: number; taxableValue: number; rate: number; cgst: number; sgst: number; igst: number; totalValue: number }>();

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGrand = 0;

  for (const inv of invoices) {
    const custGstin = (inv.customer?.gstin || "").trim().toUpperCase();
    const isB2B = custGstin.length === 15;
    const custStateCode = getStateCode(custGstin || inv.customer?.city || "");
    const pos = custStateCode || sellerStateCode || "01";
    const isInterstate = Number(inv.igst) > 0 || (custStateCode && sellerStateCode && custStateCode !== sellerStateCode);
    const supplyType = isInterstate ? "INTER" : "INTRA";

    const invTaxable = Number(inv.taxableAmount || 0);
    const invCgst = Number(inv.cgst || 0);
    const invSgst = Number(inv.sgst || 0);
    const invIgst = Number(inv.igst || 0);
    const invTotal = Number(inv.grandTotal || 0);

    totalTaxable += invTaxable;
    totalCgst += invCgst;
    totalSgst += invSgst;
    totalIgst += invIgst;
    totalGrand += invTotal;

    // Line items HSN grouping
    for (const line of inv.lines) {
      const code = line.hsnCode || "7113";
      const desc = line.description || "Jewellery Article";
      const uqc = "GMS";
      const qty = Number(line.grossWt || 1);
      const lineTaxable = Number(line.amount || 0);
      const lineTotal = Number(line.total || 0);
      const rate = Number(line.gstPct || 3);
      const lineTax = round2(lineTotal - lineTaxable);
      const lineCgst = isInterstate ? 0 : round2(lineTax / 2);
      const lineSgst = isInterstate ? 0 : round2(lineTax / 2);
      const lineIgst = isInterstate ? lineTax : 0;

      const existing = hsnMap.get(code) || {
        hsnCode: code,
        description: desc,
        uqc,
        qty: 0,
        taxableValue: 0,
        rate: round2(rate),
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalValue: 0,
      };

      existing.qty = round2(existing.qty + qty);
      existing.taxableValue = round2(existing.taxableValue + lineTaxable);
      existing.cgst = round2(existing.cgst + lineCgst);
      existing.sgst = round2(existing.sgst + lineSgst);
      existing.igst = round2(existing.igst + lineIgst);
      existing.totalValue = round2(existing.totalValue + lineTotal);
      hsnMap.set(code, existing);
    }

    if (isB2B) {
      b2bRows.push({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.date.toISOString(),
        customerName: inv.customer?.name || "Registered Customer",
        gstin: custGstin,
        pos,
        supplyType,
        taxableValue: round2(invTaxable),
        cgst: round2(invCgst),
        sgst: round2(invSgst),
        igst: round2(invIgst),
        taxAmount: round2(invCgst + invSgst + invIgst),
        total: round2(invTotal),
        reverseCharge: "N",
      });
    } else {
      // Unregistered B2C
      // Inter-state > 1,00,000 is B2C Large (Table 5)
      if (isInterstate && invTotal > 100000) {
        b2clRows.push({
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.date.toISOString(),
          customerName: inv.customer?.name || "Consumer",
          pos,
          taxableValue: round2(invTaxable),
          igst: round2(invIgst),
          taxAmount: round2(invIgst),
          total: round2(invTotal),
        });
      } else {
        // Table 7 - B2C Small
        const rate = round2(invTaxable > 0 ? ((invCgst + invSgst + invIgst) / invTaxable) * 100 : 3);
        const key = `${pos}_${supplyType}_${rate}`;
        const existing = b2csMap.get(key) || {
          pos,
          supplyType,
          rate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          count: 0,
        };
        existing.taxableValue = round2(existing.taxableValue + invTaxable);
        existing.cgst = round2(existing.cgst + invCgst);
        existing.sgst = round2(existing.sgst + invSgst);
        existing.igst = round2(existing.igst + invIgst);
        existing.count += 1;
        b2csMap.set(key, existing);
      }
    }
  }

  // Credit and Debit Notes (Table 9B)
  const cdnRows = notes.map((n) => {
    const custGstin = (n.customer?.gstin || n.supplier?.gstin || "").trim().toUpperCase();
    const pos = getStateCode(custGstin || n.customer?.city || n.supplier?.city) || sellerStateCode || "01";
    return {
      noteNo: n.noteNo,
      noteType: n.type.toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
      date: n.date.toISOString(),
      customerName: n.customer?.name || n.supplier?.name || "Party",
      gstin: custGstin,
      referenceNo: n.referenceNo || "-",
      pos,
      taxableValue: round2(n.subTotal),
      taxAmount: round2(n.taxTotal),
      total: round2(n.grandTotal),
    };
  });

  // Table 13 - Document summary
  const invoiceNos = invoices.map((i) => i.invoiceNo).filter(Boolean);
  const creditNotes = notes.filter((n) => n.type.toUpperCase() === "CREDIT");
  const debitNotes = notes.filter((n) => n.type.toUpperCase() === "DEBIT");

  const docIssue = [
    {
      docType: 1,
      name: "Invoices for outward supply",
      from: invoiceNos[0] || "-",
      to: invoiceNos[invoiceNos.length - 1] || "-",
      totalCount: invoiceNos.length,
      cancelledCount: 0,
      netIssued: invoiceNos.length,
    },
    {
      docType: 5,
      name: "Credit Notes",
      from: creditNotes[0]?.noteNo || "-",
      to: creditNotes[creditNotes.length - 1]?.noteNo || "-",
      totalCount: creditNotes.length,
      cancelledCount: 0,
      netIssued: creditNotes.length,
    },
    {
      docType: 4,
      name: "Debit Notes",
      from: debitNotes[0]?.noteNo || "-",
      to: debitNotes[debitNotes.length - 1]?.noteNo || "-",
      totalCount: debitNotes.length,
      cancelledCount: 0,
      netIssued: debitNotes.length,
    },
  ];

  return ok(res, {
    period: { ...req.query, fp, periodLabel },
    company: {
      name: company?.name || "Company",
      gstin: sellerGstin,
      state: company?.state || "State",
      stateCode: sellerStateCode,
    },
    calendar: [
      { id: 1, returnType: "GSTR1", periodLabel, dueDate: `11th of next month`, status: "UPCOMING" },
      { id: 2, returnType: "GSTR3B", periodLabel, dueDate: `20th of next month`, status: "UPCOMING" },
    ],
    b2b: b2bRows,
    b2cl: b2clRows,
    b2cs: Array.from(b2csMap.values()),
    cdn: cdnRows,
    hsn: Array.from(hsnMap.values()),
    docIssue,
    totals: {
      invoiceCount: invoices.length,
      taxableValue: round2(totalTaxable),
      cgst: round2(totalCgst),
      sgst: round2(totalSgst),
      igst: round2(totalIgst),
      taxAmount: round2(totalCgst + totalSgst + totalIgst),
      grandTotal: round2(totalGrand),
    },
  });
};

export const getGstr3b = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const sellerGstin = company?.gstin || "";
  const sellerStateCode = getStateCode(sellerGstin || company?.state);

  const { from, to, fp, periodLabel } = getPeriodDates(req.query);

  const [outward, inward, notes] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ["POSTED", "APPROVED", "PAID"] }, date: { gte: from, lt: to } },
      _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true, grandTotal: true },
      _count: { id: true },
    }),
    prisma.bill.aggregate({
      where: { companyId, status: { in: ["POSTED", "APPROVED", "PAID"] }, date: { gte: from, lt: to } },
      _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true, grandTotal: true },
      _count: { id: true },
    }),
    prisma.noteDocument.findMany({
      where: { companyId, status: { not: "VOID" }, date: { gte: from, lt: to } },
    }),
  ]);

  // Adjust outward liability for credit/debit notes
  let cdnTaxableAdjustment = 0;
  let cdnCgstAdjustment = 0;
  let cdnSgstAdjustment = 0;
  let cdnIgstAdjustment = 0;

  for (const n of notes) {
    const mult = n.type.toUpperCase() === "CREDIT" ? -1 : 1;
    cdnTaxableAdjustment += n.subTotal * mult;
    cdnCgstAdjustment += (n.taxTotal / 2) * mult;
    cdnSgstAdjustment += (n.taxTotal / 2) * mult;
  }

  const outwardTaxable = round2(Number(outward._sum?.taxableAmount || 0) + cdnTaxableAdjustment);
  const outwardCgst = round2(Number(outward._sum?.cgst || 0) + cdnCgstAdjustment);
  const outwardSgst = round2(Number(outward._sum?.sgst || 0) + cdnSgstAdjustment);
  const outwardIgst = round2(Number(outward._sum?.igst || 0) + cdnIgstAdjustment);
  const outwardTax = round2(outwardCgst + outwardSgst + outwardIgst);

  // Inward ITC from purchase bills
  const inwardTaxable = round2(Number(inward._sum?.taxableAmount || 0));
  const inwardCgst = round2(Number(inward._sum?.cgst || 0));
  const inwardSgst = round2(Number(inward._sum?.sgst || 0));
  const inwardIgst = round2(Number(inward._sum?.igst || 0));
  const inwardTax = round2(inwardCgst + inwardSgst + inwardIgst);

  // Calculate official Section 49 / Rule 88A ITC Set-off
  const setOff = calculateItcSetOff(
    { igst: outwardIgst, cgst: outwardCgst, sgst: outwardSgst },
    { igst: inwardIgst, cgst: inwardCgst, sgst: inwardSgst }
  );

  const netCashPayable = round2(setOff.payable.igst + setOff.payable.cgst + setOff.payable.sgst);

  return ok(res, {
    period: { ...req.query, fp, periodLabel },
    company: {
      name: company?.name || "Company",
      gstin: sellerGstin,
      state: company?.state || "State",
      stateCode: sellerStateCode,
    },
    outward: {
      taxableValue: outwardTaxable,
      taxAmount: outwardTax,
      cgst: outwardCgst,
      sgst: outwardSgst,
      igst: outwardIgst,
      invoiceCount: outward._count?.id || 0,
    },
    itc: {
      eligible: inwardTax,
      cgst: inwardCgst,
      sgst: inwardSgst,
      igst: inwardIgst,
      blocked: 0,
      reversed: 0,
      net: inwardTax,
      purchaseCount: inward._count?.id || 0,
    },
    setOff,
    netTaxPayable: netCashPayable,
  });
};

export const getPurchaseBillsFor2B = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { from, to, fp, periodLabel } = getPeriodDates(req.query);

  const bills = await prisma.bill.findMany({
    where: { companyId, status: { not: "VOID" } },
    include: { supplier: true, lines: true },
    orderBy: { date: "desc" },
  });

  const rows = bills.map((b) => ({
    id: b.id,
    billNo: b.billNo,
    date: b.date.toISOString(),
    supplierName: b.supplier.name,
    supplierGstin: (b.supplier.gstin || "").toUpperCase(),
    supplierState: getStateCode(b.supplier.gstin || b.supplier.city),
    taxableAmount: round2(b.taxableAmount || 0),
    cgst: round2(b.cgst || 0),
    sgst: round2(b.sgst || 0),
    igst: round2(b.igst || 0),
    taxTotal: round2((b.cgst || 0) + (b.sgst || 0) + (b.igst || 0)),
    grandTotal: round2(b.grandTotal || 0),
    status: b.status,
    isInPeriod: b.date >= from && b.date < to,
  }));

  return ok(res, {
    period: { ...req.query, fp, periodLabel },
    purchases: rows,
    periodPurchases: rows.filter((r) => r.isInPeriod),
  });
};

export const exportGstReturn = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const returnType = String(req.query.return || "gstr1").toLowerCase();
  const format = String(req.query.format || "json").toLowerCase();

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const sellerGstin = company?.gstin || "27AAAAA0000A1Z5";
  const { from, to, fp } = getPeriodDates(req.query);

  if (returnType === "gstr1" && format === "json") {
    // Generate official GST Portal Offline Tool JSON schema
    const invoices = await prisma.invoice.findMany({
      where: { companyId, status: { in: ["POSTED", "APPROVED", "PAID"] }, date: { gte: from, lt: to } },
      include: { customer: true, lines: true },
      orderBy: { date: "asc" },
    });

    const b2bMap: Record<string, any> = {};
    const b2clList: any[] = [];
    const b2csMap: Record<string, any> = {};
    const hsnData: any[] = [];

    invoices.forEach((inv) => {
      const ctin = (inv.customer?.gstin || "").trim().toUpperCase();
      const pos = getStateCode(ctin || inv.customer?.city) || getStateCode(company?.state) || "27";
      const isInter = Number(inv.igst) > 0;

      if (ctin.length === 15) {
        if (!b2bMap[ctin]) b2bMap[ctin] = { ctin, inv: [] };
        b2bMap[ctin].inv.push({
          inum: inv.invoiceNo,
          idt: new Date(inv.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
          val: round2(inv.grandTotal),
          pos,
          rchrg: "N",
          etin: "",
          inv_typ: "R",
          itms: [
            {
              num: 1,
              itm_det: {
                rt: round2(inv.taxableAmount > 0 ? ((inv.cgst + inv.sgst + inv.igst) / inv.taxableAmount) * 100 : 3),
                txval: round2(inv.taxableAmount),
                iamt: round2(inv.igst),
                camt: round2(inv.cgst),
                samt: round2(inv.sgst),
                csamt: 0,
              },
            },
          ],
        });
      } else if (isInter && inv.grandTotal > 100000) {
        b2clList.push({
          pos,
          inv: [
            {
              inum: inv.invoiceNo,
              idt: new Date(inv.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
              val: round2(inv.grandTotal),
              itms: [
                {
                  num: 1,
                  itm_det: {
                    rt: round2(inv.taxableAmount > 0 ? (inv.igst / inv.taxableAmount) * 100 : 3),
                    txval: round2(inv.taxableAmount),
                    iamt: round2(inv.igst),
                    csamt: 0,
                  },
                },
              ],
            },
          ],
        });
      } else {
        const rt = round2(inv.taxableAmount > 0 ? ((inv.cgst + inv.sgst + inv.igst) / inv.taxableAmount) * 100 : 3);
        const key = `${pos}_${rt}_${isInter ? "INTER" : "INTRA"}`;
        if (!b2csMap[key]) {
          b2csMap[key] = {
            sply_ty: isInter ? "INTER" : "INTRA",
            pos,
            typ: "OE",
            rt,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }
        b2csMap[key].txval = round2(b2csMap[key].txval + inv.taxableAmount);
        b2csMap[key].iamt = round2(b2csMap[key].iamt + inv.igst);
        b2csMap[key].camt = round2(b2csMap[key].camt + inv.cgst);
        b2csMap[key].samt = round2(b2csMap[key].samt + inv.sgst);
      }
    });

    const portalPayload = {
      gstin: sellerGstin,
      fp,
      cur_gt: 0,
      b2b: Object.values(b2bMap),
      b2cl: b2clList,
      b2cs: Object.values(b2csMap),
      cdnr: [],
      cdnur: [],
      hsn: { data: hsnData },
      doc_issue: { doc_det: [] },
    };

    res.setHeader("Content-Disposition", `attachment; filename="GSTR1_${sellerGstin}_${fp}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(portalPayload, null, 2));
  }

  const stamp = new Date().toISOString();
  return ok(res, { message: "GST export generated", generatedAt: stamp });
};

export const getTdsSummary = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const bills = await prisma.bill.findMany({
    where: { companyId, status: { not: "VOID" } },
    include: { supplier: true },
  });

  // Calculate 194Q TDS threshold (₹50 Lakhs turnover in financial year)
  const vendorTotals = new Map<number, { supplierName: string; gstin: string; totalPurchase: number; billCount: number }>();

  for (const bill of bills) {
    const cur = vendorTotals.get(bill.supplierId) || {
      supplierName: bill.supplier.name,
      gstin: bill.supplier.gstin || "",
      totalPurchase: 0,
      billCount: 0,
    };
    cur.totalPurchase += Number(bill.grandTotal || 0);
    cur.billCount += 1;
    vendorTotals.set(bill.supplierId, cur);
  }

  const THRESHOLD = 5000000; // 50 Lakhs

  const rows = Array.from(vendorTotals.entries()).map(([supplierId, data]) => {
    const thresholdCrossed = data.totalPurchase > THRESHOLD;
    const taxableTdsAmount = thresholdCrossed ? data.totalPurchase - THRESHOLD : 0;
    const tdsAmount = round2(taxableTdsAmount * 0.001); // 0.1% TDS under Sec 194Q
    return {
      id: supplierId,
      vendorName: data.supplierName,
      gstin: data.gstin,
      section: "194Q (Purchase of Goods > ₹50L)",
      thresholdCrossed,
      purchaseAmount: round2(data.totalPurchase),
      threshold: THRESHOLD,
      tdsRate: 0.1,
      tdsAmount,
      billCount: data.billCount,
      deductedAt: new Date().toISOString(),
    };
  });

  return ok(res, {
    rows,
    totals: {
      totalPurchases: round2(rows.reduce((sum, row) => sum + row.purchaseAmount, 0)),
      totalTds: round2(rows.reduce((sum, row) => sum + row.tdsAmount, 0)),
      vendors: rows.length,
      vendorsOverThreshold: rows.filter((r) => r.thresholdCrossed).length,
    },
  });
};

export const getHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const rows = await prisma.hSNMaster.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  return ok(res, rows);
};

export const createHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = hsnCreateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid HSN payload", parsed.error.issues);

  const existing = await prisma.hSNMaster.findFirst({
    where: { companyId, code: parsed.data.code },
  });
  if (existing) {
    return fail(res, 409, "HSN_EXISTS", "HSN code already exists");
  }

  const row = await prisma.hSNMaster.create({
    data: {
      code: parsed.data.code,
      description: parsed.data.description,
      gstRate: parsed.data.gstRate,
      cessRate: parsed.data.cessRate,
      isActive: parsed.data.isActive ?? true,
      companyId,
      createdBy: getActor(req),
    },
  });

  return created(res, row, "HSN added");
};

export const updateHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = hsnUpdateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid HSN update payload", parsed.error.issues);

  try {
    const row = await prisma.hSNMaster.update({
      where: { id: Number(req.params.id), companyId },
      data: parsed.data,
    });
    return ok(res, row, "HSN updated");
  } catch {
    return fail(res, 404, "HSN_NOT_FOUND", "HSN code not found");
  }
};
