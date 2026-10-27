import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatQrPayload, computeCompanyToken } from "@jewelledger/shared";

export interface LabelItemData {
  id: number;
  sku: string;
  name: string;
  category?: string;
  karat?: string;
  grossWt?: number;
  netWt?: number;
  huid?: string;
  mrp?: number;
  code: string;
  codeType?: string;
  copies?: number;
}

export interface LabelPrintOptions {
  templateCode: "THERMAL_50X25" | "THERMAL_38X25" | "THERMAL_100X50" | "A4_SHEET_3X8";
  companyName: string;
  companyId: number;
  offsetXmm?: number;
  offsetYmm?: number;
  showPrice?: boolean;
  showWeight?: boolean;
  showKarat?: boolean;
  showHuid?: boolean;
}

const MM_TO_PT = 72 / 25.4;

/**
 * Truncates text so that it fits strictly on a single line within maxWidth.
 * Prevents any wrapping, line height calculation errors, or text overlapping.
 */
function fitText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string {
  if (!text) return "";
  const clean = text.trim();
  if (doc.widthOfString(clean) <= maxWidth) return clean;

  let str = clean;
  while (str.length > 0 && doc.widthOfString(str + "...") > maxWidth) {
    str = str.slice(0, -1);
  }
  return str ? str + "..." : "";
}

function formatINR(val: number): string {
  if (!val || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
}

export async function generateLabelsPdf(
  items: LabelItemData[],
  options: LabelPrintOptions
): Promise<Buffer> {
  const showPrice = options.showPrice ?? true;
  const showWeight = options.showWeight ?? true;
  const showKarat = options.showKarat ?? true;
  const showHuid = options.showHuid ?? true;
  const offsetX = (options.offsetXmm || 0) * MM_TO_PT;
  const offsetY = (options.offsetYmm || 0) * MM_TO_PT;

  // Flatten items based on copies
  const expandedItems: LabelItemData[] = [];
  for (const item of items) {
    const qty = Math.max(1, item.copies || 1);
    for (let i = 0; i < qty; i++) {
      expandedItems.push(item);
    }
  }

  if (expandedItems.length === 0) {
    throw new Error("No labels to print");
  }

  // Pre-generate QR buffers for high performance
  const qrBuffers = new Map<string, Buffer>();
  for (const item of items) {
    if (!qrBuffers.has(item.code)) {
      const payload = formatQrPayload(options.companyId, item.code);
      const buf = await QRCode.toBuffer(payload, {
        type: "png",
        margin: 0,
        errorCorrectionLevel: "M",
        width: 320,
      });
      qrBuffers.set(item.code, buf);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      if (options.templateCode === "A4_SHEET_3X8") {
        // A4 sheet mode (3 cols x 8 rows = 24 labels per sheet, Avery 7160 / 3658 compatible)
        const doc = new PDFDocument({
          size: "A4",
          margin: 0,
          autoFirstPage: true,
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const colWidth = 64 * MM_TO_PT; // ~181.4 pt
        const rowHeight = 33.9 * MM_TO_PT; // ~96.1 pt
        const marginX = 8.5 * MM_TO_PT + offsetX;
        const marginY = 13 * MM_TO_PT + offsetY;
        const colGap = 2.5 * MM_TO_PT;

        let currentIndex = 0;
        while (currentIndex < expandedItems.length) {
          if (currentIndex > 0) {
            doc.addPage();
          }

          const pageItems = expandedItems.slice(currentIndex, currentIndex + 24);
          for (let i = 0; i < pageItems.length; i++) {
            const item = pageItems[i];
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = marginX + col * (colWidth + colGap);
            const y = marginY + row * rowHeight;

            renderA4Label(doc, item, x, y, colWidth, rowHeight, {
              companyName: options.companyName,
              qrBuffer: qrBuffers.get(item.code)!,
              showPrice,
              showWeight,
              showKarat,
              showHuid,
            });
          }

          currentIndex += 24;
        }

        doc.end();
      } else {
        // Thermal single label roll mode
        let widthMm = 50;
        let heightMm = 25;
        if (options.templateCode === "THERMAL_38X25") {
          widthMm = 38;
          heightMm = 25;
        } else if (options.templateCode === "THERMAL_100X50") {
          widthMm = 100;
          heightMm = 50;
        }

        const widthPt = widthMm * MM_TO_PT;
        const heightPt = heightMm * MM_TO_PT;

        const doc = new PDFDocument({
          size: [widthPt, heightPt],
          margin: 0,
          autoFirstPage: false,
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        for (const item of expandedItems) {
          doc.addPage({ size: [widthPt, heightPt], margin: 0 });
          const qrBuf = qrBuffers.get(item.code)!;

          if (options.templateCode === "THERMAL_50X25") {
            renderThermal50x25(doc, item, offsetX, offsetY, widthPt, heightPt, {
              companyName: options.companyName,
              qrBuffer: qrBuf,
              showPrice,
              showWeight,
              showKarat,
              showHuid,
            });
          } else if (options.templateCode === "THERMAL_38X25") {
            renderThermal38x25(doc, item, offsetX, offsetY, widthPt, heightPt, {
              companyName: options.companyName,
              qrBuffer: qrBuf,
              showPrice,
              showWeight,
              showKarat,
              showHuid,
            });
          } else {
            renderThermal100x50(doc, item, offsetX, offsetY, widthPt, heightPt, {
              companyName: options.companyName,
              qrBuffer: qrBuf,
              showPrice,
              showWeight,
              showKarat,
              showHuid,
            });
          }
        }

        doc.end();
      }
    } catch (err) {
      reject(err);
    }
  });
}

interface RenderContext {
  companyName: string;
  qrBuffer: Buffer;
  showPrice: boolean;
  showWeight: boolean;
  showKarat: boolean;
  showHuid: boolean;
}

/**
 * Standard 50×25mm Thermal Jewellery Tag
 * widthPt = 141.7 pt, heightPt = 70.8 pt
 */
function renderThermal50x25(
  doc: PDFKit.PDFDocument,
  item: LabelItemData,
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: RenderContext
) {
  const pad = 2 * MM_TO_PT; // ~5.6 pt
  const qrSize = 17 * MM_TO_PT; // 17mm = ~48.2 pt
  const qrX = x + pad;
  const qrY = y + (height - qrSize) / 2;

  // Draw QR code with crisp vector bounds
  doc.image(ctx.qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Right column text area
  const textX = qrX + qrSize + 2.5 * MM_TO_PT;
  const textWidth = width - (textX - x) - pad;

  // Line 1: Company Header (y + 6 pt)
  doc.fontSize(5).font("Helvetica-Bold").fillColor("#64748b");
  const compStr = fitText(doc, (ctx.companyName || "JEWELLEDGER").toUpperCase(), textWidth);
  doc.text(compStr, textX, y + 6, { lineBreak: false });

  // Line 2: Product Name (y + 15 pt)
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#0f172a");
  const nameStr = fitText(doc, item.name, textWidth);
  doc.text(nameStr, textX, y + 15, { lineBreak: false });

  // Line 3: Purity & Net Wt (y + 25 pt)
  const specs: string[] = [];
  if (ctx.showKarat && item.karat) specs.push(item.karat);
  if (ctx.showWeight && item.netWt != null) specs.push(`Net: ${Number(item.netWt).toFixed(2)}g`);
  doc.fontSize(6).font("Helvetica-Bold").fillColor("#1e293b");
  const specStr = fitText(doc, specs.join("  |  "), textWidth);
  doc.text(specStr, textX, y + 25, { lineBreak: false });

  // Line 4: Gross Wt (if different from net) or Category (y + 34 pt)
  let line4 = "";
  if (ctx.showWeight && item.grossWt != null && item.grossWt !== item.netWt) {
    line4 = `Gross: ${Number(item.grossWt).toFixed(2)}g`;
  } else if (item.category) {
    line4 = item.category;
  }
  if (line4) {
    doc.fontSize(5).font("Helvetica").fillColor("#64748b");
    const l4Str = fitText(doc, line4, textWidth);
    doc.text(l4Str, textX, y + 34, { lineBreak: false });
  }

  // Line 5: MRP / Price (y + 44 pt)
  if (ctx.showPrice && item.mrp && item.mrp > 0) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#b45309");
    const priceStr = fitText(doc, `MRP: Rs. ${formatINR(item.mrp)}`, textWidth);
    doc.text(priceStr, textX, y + 44, { lineBreak: false });
  }

  // Line 6: Unique Code (y + 55 pt)
  doc.fontSize(5.5).font("Courier-Bold").fillColor("#0f172a");
  const codeStr = fitText(doc, item.code, textWidth);
  doc.text(codeStr, textX, y + 55, { lineBreak: false });
}

/**
 * Compact 38×25mm Thermal Jewellery Tag (for rings/earrings)
 * widthPt = 107.7 pt, heightPt = 70.8 pt
 */
function renderThermal38x25(
  doc: PDFKit.PDFDocument,
  item: LabelItemData,
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: RenderContext
) {
  const pad = 1.5 * MM_TO_PT; // ~4.2 pt
  const qrSize = 15 * MM_TO_PT; // 15mm = ~42.5 pt
  const qrX = x + pad;
  const qrY = y + (height - qrSize) / 2;

  doc.image(ctx.qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  const textX = qrX + qrSize + 2 * MM_TO_PT;
  const textWidth = width - (textX - x) - pad;

  // Line 1: Item Name (y + 8 pt)
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#0f172a");
  const nameStr = fitText(doc, item.name, textWidth);
  doc.text(nameStr, textX, y + 8, { lineBreak: false });

  // Line 2: Karat & Net Wt (y + 19 pt)
  const specs: string[] = [];
  if (ctx.showKarat && item.karat) specs.push(item.karat);
  if (ctx.showWeight && item.netWt != null) specs.push(`${Number(item.netWt).toFixed(2)}g`);
  doc.fontSize(5.5).font("Helvetica-Bold").fillColor("#1e293b");
  const specStr = fitText(doc, specs.join(" "), textWidth);
  doc.text(specStr, textX, y + 19, { lineBreak: false });

  // Line 3: Price (y + 30 pt)
  if (ctx.showPrice && item.mrp && item.mrp > 0) {
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#b45309");
    const priceStr = fitText(doc, `Rs. ${formatINR(item.mrp)}`, textWidth);
    doc.text(priceStr, textX, y + 30, { lineBreak: false });
  }

  // Line 4: Code (y + 42 pt)
  doc.fontSize(5).font("Courier-Bold").fillColor("#0f172a");
  const codeStr = fitText(doc, item.code, textWidth);
  doc.text(codeStr, textX, y + 42, { lineBreak: false });
}

/**
 * Large 100×50mm Thermal Retail Box / Parcel Label
 * widthPt = 283.4 pt, heightPt = 141.7 pt
 */
function renderThermal100x50(
  doc: PDFKit.PDFDocument,
  item: LabelItemData,
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: RenderContext
) {
  const pad = 4 * MM_TO_PT; // ~11.3 pt
  const qrSize = 34 * MM_TO_PT; // 34mm = ~96.4 pt
  const qrX = x + pad;
  const qrY = y + (height - qrSize) / 2;

  doc.image(ctx.qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  const textX = qrX + qrSize + 4 * MM_TO_PT;
  const textWidth = width - (textX - x) - pad;

  // Header / Brand (y + 14 pt)
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b");
  const compStr = fitText(doc, (ctx.companyName || "JEWELLEDGER").toUpperCase(), textWidth);
  doc.text(compStr, textX, y + 14, { lineBreak: false });

  // Item Name (y + 29 pt)
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#0f172a");
  const nameStr = fitText(doc, item.name, textWidth);
  doc.text(nameStr, textX, y + 29, { lineBreak: false });

  // Specs: Purity & Net Wt (y + 49 pt)
  const specs: string[] = [];
  if (ctx.showKarat && item.karat) specs.push(`Purity: ${item.karat}`);
  if (ctx.showWeight && item.netWt != null) specs.push(`Net Wt: ${Number(item.netWt).toFixed(3)}g`);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#1e293b");
  const specStr = fitText(doc, specs.join("   |   "), textWidth);
  doc.text(specStr, textX, y + 49, { lineBreak: false });

  // Gross Wt (y + 66 pt)
  if (ctx.showWeight && item.grossWt != null) {
    doc.fontSize(8).font("Helvetica").fillColor("#475569");
    const grStr = fitText(doc, `Gross Wt: ${Number(item.grossWt).toFixed(3)}g`, textWidth);
    doc.text(grStr, textX, y + 66, { lineBreak: false });
  }

  // Price (y + 83 pt)
  if (ctx.showPrice && item.mrp && item.mrp > 0) {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#b45309");
    const priceStr = fitText(doc, `MRP: Rs. ${formatINR(item.mrp)}`, textWidth);
    doc.text(priceStr, textX, y + 83, { lineBreak: false });
  }

  // Code & SKU (y + 104 pt)
  doc.fontSize(8.5).font("Courier-Bold").fillColor("#0f172a");
  const codeStr = fitText(doc, `CODE: ${item.code}   SKU: ${item.sku}`, textWidth);
  doc.text(codeStr, textX, y + 104, { lineBreak: false });
}

/**
 * Standard A4 Sticker Sheet (24-Up, 3×8 grid)
 * colWidth = 64mm = ~181.4 pt, rowHeight = 33.9mm = ~96.1 pt
 */
function renderA4Label(
  doc: PDFKit.PDFDocument,
  item: LabelItemData,
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: RenderContext
) {
  // Clean, subtle peel guideline border
  doc
    .roundedRect(x + 1, y + 1, width - 2, height - 2, 2)
    .lineWidth(0.4)
    .strokeColor("#cbd5e1")
    .stroke();

  const pad = 2.5 * MM_TO_PT; // ~7.1 pt
  const qrSize = 22 * MM_TO_PT; // 22mm = ~62.4 pt
  const qrX = x + pad;
  const qrY = y + (height - qrSize) / 2;

  // Draw crisp vector QR code
  doc.image(ctx.qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Right column text area
  const textX = qrX + qrSize + 3 * MM_TO_PT;
  const textWidth = width - (textX - x) - pad;

  // Line 1: Company Header (y + 9 pt)
  doc.fontSize(6).font("Helvetica-Bold").fillColor("#64748b");
  const compStr = fitText(doc, (ctx.companyName || "JEWELLEDGER").toUpperCase(), textWidth);
  doc.text(compStr, textX, y + 9, { lineBreak: false });

  // Line 2: Product Name (y + 20 pt)
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#0f172a");
  const nameStr = fitText(doc, item.name, textWidth);
  doc.text(nameStr, textX, y + 20, { lineBreak: false });

  // Line 3: Purity & Net Weight (y + 33 pt)
  const specs: string[] = [];
  if (ctx.showKarat && item.karat) specs.push(item.karat);
  if (ctx.showWeight && item.netWt != null) specs.push(`Net: ${Number(item.netWt).toFixed(3)}g`);
  doc.fontSize(7).font("Helvetica-Bold").fillColor("#1e293b");
  const specStr = fitText(doc, specs.join("  |  "), textWidth);
  doc.text(specStr, textX, y + 33, { lineBreak: false });

  // Line 4: Gross Wt (if different from net) (y + 44 pt)
  let line4 = "";
  if (ctx.showWeight && item.grossWt != null && item.grossWt !== item.netWt) {
    line4 = `Gross: ${Number(item.grossWt).toFixed(3)}g`;
  } else if (item.category) {
    line4 = `Category: ${item.category}`;
  }
  if (line4) {
    doc.fontSize(6).font("Helvetica").fillColor("#64748b");
    const l4Str = fitText(doc, line4, textWidth);
    doc.text(l4Str, textX, y + 44, { lineBreak: false });
  }

  // Line 5: MRP Price (y + 56 pt)
  if (ctx.showPrice && item.mrp && item.mrp > 0) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#b45309");
    const priceStr = fitText(doc, `MRP: Rs. ${formatINR(item.mrp)}`, textWidth);
    doc.text(priceStr, textX, y + 56, { lineBreak: false });
  }

  // Line 6: Unique Code (y + 70 pt)
  doc.fontSize(6.5).font("Courier-Bold").fillColor("#0f172a");
  const codeStr = fitText(doc, item.code, textWidth);
  doc.text(codeStr, textX, y + 70, { lineBreak: false });
}
