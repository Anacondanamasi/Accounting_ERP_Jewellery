import PDFDocument from "pdfkit";

// Helper for Indian Rupees to Words
export function numberToWordsIndian(num: number): string {
  if (isNaN(num) || num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatLessThanThousand = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const rounded = Math.round(num * 100) / 100;
  const intPart = Math.floor(Math.abs(rounded));
  const paisePart = Math.round((Math.abs(rounded) - intPart) * 100);

  let result = "";
  let rem = intPart;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crore > 0) result += formatLessThanThousand(crore) + "Crore ";
  if (lakh > 0) result += formatLessThanThousand(lakh) + "Lakh ";
  if (thousand > 0) result += formatLessThanThousand(thousand) + "Thousand ";
  if (hundreds > 0) result += formatLessThanThousand(hundreds);

  result = result.trim() + " Rupees";
  if (paisePart > 0) {
    result += " and " + formatLessThanThousand(paisePart).trim() + " Paise";
  }
  return (result + " Only").replace(/\s+/g, " ");
}

export function formatINR(val: number | undefined | null): string {
  const n = Number(val || 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

function getStateFromGstin(gstin?: string | null): { state: string; code: string } {
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    if (STATE_CODES[code]) {
      return { state: STATE_CODES[code], code };
    }
  }
  return { state: "Gujarat", code: "24" };
}

export interface InvoicePdfPayload {
  invoice: any;
  company: any;
  bankAccount?: any;
}

export function generateInvoicePdf(data: InvoicePdfPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { invoice, company, bankAccount } = data;

      const doc = new PDFDocument({
        margin: 20,
        size: "A4",
        info: {
          Title: `TAX INVOICE - ${invoice.invoiceNo}`,
          Author: company?.legalName || company?.name || "Jewellery Billing System",
          Subject: "Indian GST Tax Invoice",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const margin = 20;
      const contentWidth = 555;
      let y = margin;

      const companyStateInfo = getStateFromGstin(company?.gstin);
      const customerStateInfo = getStateFromGstin(invoice.customer?.gstin);
      const isInterState =
        Number(invoice.igst) > 0 ||
        (companyStateInfo.code && customerStateInfo.code && companyStateInfo.code !== customerStateInfo.code);

      // Top Header: Business Details on Left, TAX INVOICE title on Right
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000");
      doc.text(company?.legalName || company?.name || "MEHTA JEWELLERS PRIVATE LIMITED", margin + 6, y + 6);
      
      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("TAX INVOICE", margin + 350, y + 6, { width: 195, align: "right" });

      doc.fontSize(7.5).font("Helvetica").fillColor("#333333");
      const companyAddr = [
        company?.addressLine1 || "Showroom 101-104, Jewel World",
        company?.city ? `${company.city} - 380009` : "Ahmedabad - 380009",
        `GSTIN/UIN: ${company?.gstin || "24AAACM1234A1Z1"} | PAN: ${company?.pan || "AAACM1234A"}`,
        companyStateInfo.code ? `State: ${companyStateInfo.code} - ${companyStateInfo.state}` : "",
        [company?.phone ? `Phone: ${company.phone}` : "+91 79 2658 9000", company?.email ? `Email: ${company.email}` : "contact@mehtajewellers.in"].filter(Boolean).join(" | "),
      ].filter(Boolean).join("\n");

      const addrHeight = doc.heightOfString(companyAddr, { width: 340, lineGap: 1.5 });
      doc.text(companyAddr, margin + 6, y + 20, { width: 340, lineGap: 1.5 });

      const headerHeight = Math.max(76, 20 + addrHeight + 8);
      y = margin + headerHeight;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).lineWidth(0.75).strokeColor("#000000").stroke();

      // Invoice Details Sub-Header
      const subHeaderHeight = 42;
      doc.rect(margin, y, contentWidth, subHeaderHeight).lineWidth(0.5).strokeColor("#000000").stroke();
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#000000");
      
      // Col 1: Invoice No & Date
      doc.text("INVOICE NO:", margin + 6, y + 5);
      doc.font("Helvetica").text(invoice.invoiceNo, margin + 70, y + 5);
      doc.font("Helvetica-Bold").text("DATED:", margin + 195, y + 5);
      doc.font("Helvetica").text(new Date(invoice.date).toLocaleDateString("en-GB"), margin + 235, y + 5);
      doc.font("Helvetica-Bold").text("DUE DATE:", margin + 370, y + 5);
      doc.font("Helvetica").text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "-", margin + 425, y + 5);

      // Row 2: Place of Supply, Terms & Reverse Charge (Rule 46(p))
      doc.font("Helvetica-Bold").text("PLACE OF SUPPLY:", margin + 6, y + 17);
      doc.font("Helvetica").text(`${customerStateInfo.code} - ${customerStateInfo.state}`, margin + 95, y + 17);
      doc.font("Helvetica-Bold").text("MODE:", margin + 260, y + 17);
      doc.font("Helvetica").text(invoice.paymentMode || "Credit / Bank", margin + 295, y + 17);
      doc.font("Helvetica-Bold").text("RCM APPLICABLE:", margin + 400, y + 17);
      doc.font("Helvetica").text(invoice.isRcm || invoice.reverseCharge === "Y" ? "YES" : "NO", margin + 480, y + 17);

      // Row 3: Metal Rates
      doc.font("Helvetica-Bold").text("METAL RATES:", margin + 6, y + 29);
      doc.font("Helvetica").text("24K: Rs.75,200.00/g  |  22K: Rs.68,930.00/g  |  18K: Rs.56,400.00/g", margin + 75, y + 29);

      y += subHeaderHeight;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).lineWidth(0.75).strokeColor("#000000").stroke();

      // Billed To / Shipped To
      const halfWidth = contentWidth / 2;
      doc.rect(margin, y, halfWidth, 50).lineWidth(0.5).strokeColor("#000000").stroke();
      doc.rect(margin + halfWidth, y, halfWidth, 50).lineWidth(0.5).strokeColor("#000000").stroke();

      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#000000");
      doc.text("BILLED TO", margin + 6, y + 4);
      doc.text("SHIPPED TO", margin + halfWidth + 6, y + 4);

      const customerName = invoice.customer?.name || "Cash Customer";
      const customerGstin = invoice.customer?.gstin || "Unregistered (B2C)";
      const customerPan = invoice.customer?.pan || "-";

      doc.fontSize(8).font("Helvetica-Bold").text(`M/s ${customerName}`, margin + 6, y + 14);
      doc.text(`M/s ${customerName}`, margin + halfWidth + 6, y + 14);

      doc.fontSize(7).font("Helvetica").fillColor("#333333");
      const clientInfo = `${invoice.customer?.city || "Gujarat"}\nGSTIN/UIN: ${customerGstin}  |  PAN: ${customerPan}\nState: ${customerStateInfo.code} - ${customerStateInfo.state}`;
      doc.text(clientInfo, margin + 6, y + 24, { lineGap: 1.5 });
      doc.text(clientInfo, margin + halfWidth + 6, y + 24, { lineGap: 1.5 });

      y += 50;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).lineWidth(0.75).strokeColor("#000000").stroke();

      // Line Items Table Header
      const thHeight = 18;
      doc.rect(margin, y, contentWidth, thHeight).lineWidth(0.5).strokeColor("#000000").fillColor("#F8FAFC").fillAndStroke();

      const cols = [
        { label: "SR", x: margin + 4, w: 20, align: "left" },
        { label: "DESCRIPTION OF GOODS", x: margin + 26, w: 160, align: "left" },
        { label: "HSN", x: margin + 188, w: 32, align: "center" },
        { label: "GROSS (G)", x: margin + 222, w: 42, align: "right" },
        { label: "NET (G)", x: margin + 266, w: 42, align: "right" },
        { label: "RATE/G", x: margin + 310, w: 42, align: "right" },
        { label: "MAKING", x: margin + 354, w: 40, align: "right" },
        { label: "TAXABLE", x: margin + 396, w: 50, align: "right" },
        { label: isInterState ? "IGST" : "GST", x: margin + 448, w: 45, align: "right" },
        { label: "AMOUNT", x: margin + 495, w: 56, align: "right" },
      ];

      doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#000000");
      cols.forEach((col) => {
        doc.text(col.label, col.x, y + 5, { width: col.w, align: col.align as any });
      });

      y += thHeight;

      // Line Items
      let totalGross = 0;
      let totalNet = 0;
      let totalTaxable = 0;
      let totalTax = 0;

      const lines = invoice.lines || [];
      lines.forEach((line: any, idx: number) => {
        const rowHeight = 20;
        doc.rect(margin, y, contentWidth, rowHeight).lineWidth(0.5).strokeColor("#E2E8F0").stroke();

        const gross = Number(line.grossWt || line.quantity || 0);
        const net = Number(line.netWt || gross);
        const taxable = Number(line.amount || 0);
        const total = Number(line.total || 0);
        const lineTax = total - taxable;

        totalGross += gross;
        totalNet += net;
        totalTaxable += taxable;
        totalTax += lineTax;

        doc.fontSize(7).font("Helvetica").fillColor("#000000");
        doc.text(String(idx + 1), cols[0].x, y + 5, { width: cols[0].w, align: "left" });
        
        doc.font("Helvetica-Bold").text(line.description || "Jewellery Item", cols[1].x, y + 3, { width: cols[1].w });
        doc.fontSize(6).font("Helvetica").fillColor("#666666").text(`${line.karat || "22K"} ${line.huid ? `· HUID: ${line.huid}` : ""}`, cols[1].x, y + 11);
        
        doc.fontSize(7).font("Helvetica").fillColor("#000000");
        doc.text(line.hsnCode || "7113", cols[2].x, y + 5, { width: cols[2].w, align: "center" });
        doc.text(gross.toFixed(3), cols[3].x, y + 5, { width: cols[3].w, align: "right" });
        doc.text(net.toFixed(3), cols[4].x, y + 5, { width: cols[4].w, align: "right" });
        doc.text(formatINR(line.ratePerGram || line.rate), cols[5].x, y + 5, { width: cols[5].w, align: "right" });
        doc.text(formatINR(line.makingAmount || line.makingRate), cols[6].x, y + 5, { width: cols[6].w, align: "right" });
        doc.text(formatINR(taxable), cols[7].x, y + 5, { width: cols[7].w, align: "right" });
        doc.text(`${formatINR(lineTax)} (${line.gstPct || 3}%)`, cols[8].x, y + 5, { width: cols[8].w, align: "right" });
        doc.font("Helvetica-Bold").text(formatINR(total), cols[9].x, y + 5, { width: cols[9].w, align: "right" });

        y += rowHeight;
      });

      // Total Weight Row
      doc.rect(margin, y, contentWidth, 16).lineWidth(0.5).strokeColor("#000000").fillColor("#F8FAFC").fillAndStroke();
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#000000");
      doc.text("Total Item Weight", margin + 6, y + 4);
      doc.text(`${totalGross.toFixed(3)} g`, cols[3].x, y + 4, { width: cols[3].w, align: "right" });
      doc.text(`${totalNet.toFixed(3)} g`, cols[4].x, y + 4, { width: cols[4].w, align: "right" });
      doc.text(formatINR(totalTaxable), cols[7].x, y + 4, { width: cols[7].w, align: "right" });
      doc.text(formatINR(totalTax), cols[8].x, y + 4, { width: cols[8].w, align: "right" });
      doc.text(formatINR(invoice.grandTotal), cols[9].x, y + 4, { width: cols[9].w, align: "right" });

      y += 16;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).lineWidth(0.75).strokeColor("#000000").stroke();

      // Bottom Section: Left side (HSN, Words, Bank, Terms) | Right side (Totals)
      const leftColWidth = 345;
      const rightColWidth = contentWidth - leftColWidth;
      const bottomStartY = y;

      // Left: Dynamic Multi-HSN Summary Table (Rule 46 compliant)
      doc.rect(margin, y, leftColWidth, 14).fillColor("#F1F5F9").fill();
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#000000");
      doc.text("HSN/SAC SUMMARY BREAKDOWN", margin + 6, y + 4);

      // Group lines by HSN
      const hsnSummaryMap: Record<string, { hsn: string; taxable: number; tax: number; rate: number }> = {};
      lines.forEach((l: any) => {
        const code = String(l.hsnCode || "7113");
        const taxable = Number(l.amount || 0);
        const lineTotal = Number(l.total || 0);
        const tax = lineTotal - taxable;
        const rate = Number(l.gstPct || (taxable > 0 ? (tax / taxable) * 100 : 3));
        if (!hsnSummaryMap[code]) {
          hsnSummaryMap[code] = { hsn: code, taxable: 0, tax: 0, rate };
        }
        hsnSummaryMap[code].taxable += taxable;
        hsnSummaryMap[code].tax += tax;
      });

      const hsnRows = Object.values(hsnSummaryMap);
      if (hsnRows.length === 0) {
        hsnRows.push({ hsn: "7113", taxable: totalTaxable, tax: totalTax, rate: 3 });
      }

      hsnRows.slice(0, 2).forEach((hr) => {
        y += 13;
        doc.fontSize(6.5).font("Helvetica").fillColor("#000000");
        doc.text(`HSN: ${hr.hsn}`, margin + 6, y + 2);
        doc.text(`Taxable: Rs. ${formatINR(hr.taxable)}`, margin + 55, y + 2);
        if (isInterState) {
          doc.text(`IGST (${hr.rate}%): Rs. ${formatINR(hr.tax)}`, margin + 180, y + 2);
        } else {
          const halfRate = (hr.rate / 2).toFixed(1);
          const halfTax = hr.tax / 2;
          doc.text(`CGST (${halfRate}%): Rs. ${formatINR(halfTax)}`, margin + 155, y + 2);
          doc.text(`SGST (${halfRate}%): Rs. ${formatINR(halfTax)}`, margin + 250, y + 2);
        }
      });

      y += 15;
      doc.moveTo(margin, y).lineTo(margin + leftColWidth, y).lineWidth(0.5).strokeColor("#CBD5E1").stroke();

      // Amount in Words
      y += 4;
      doc.fontSize(6.5).font("Helvetica-Bold").text("AMOUNT CHARGEABLE (IN WORDS):", margin + 6, y);
      doc.fontSize(7).font("Helvetica").text(numberToWordsIndian(invoice.grandTotal), margin + 6, y + 10, { width: leftColWidth - 12 });

      y += 24;
      doc.moveTo(margin, y).lineTo(margin + leftColWidth, y).lineWidth(0.5).strokeColor("#CBD5E1").stroke();

      // Bank Details
      y += 4;
      doc.fontSize(6.5).font("Helvetica-Bold").text("BANK DETAILS FOR PAYMENT (NEFT / RTGS / IMPS):", margin + 6, y);
      const bank = bankAccount || { name: "HDFC Bank", accountNumber: "99992026007", ifsc: "HDFC0001234", branch: "C.G. Road Branch" };
      doc.fontSize(7).font("Helvetica").text(
        `Bank: ${bank.name || "Test Bank"}  |  A/c No: ${bank.accountNumber || "9999"}  |  IFSC: ${bank.ifsc || "HDFC0001234"}\nA/c Name: ${company?.legalName || company?.name}  |  Branch: ${bank.branch || "Main"}`,
        margin + 6,
        y + 10,
        { width: leftColWidth - 12, lineGap: 1.5 }
      );

      y += 26;
      doc.moveTo(margin, y).lineTo(margin + leftColWidth, y).lineWidth(0.5).strokeColor("#CBD5E1").stroke();

      // Terms & Conditions
      y += 4;
      doc.fontSize(6.5).font("Helvetica-Bold").text("TERMS & CONDITIONS / DECLARATION:", margin + 6, y);
      doc.fontSize(6).font("Helvetica").text(
        "1. Goods once sold will not be taken back without original invoice.\n2. Gold jewellery sold is 100% certified as per Bureau of Indian Standards (BIS) norms.\n3. Subject to local jurisdiction only. E. & O.E.",
        margin + 6,
        y + 10,
        { width: leftColWidth - 12, lineGap: 1.5 }
      );

      // Right Column: Summary Totals
      const rx = margin + leftColWidth;
      let ry = bottomStartY;

      const totalRows = [
        { label: "Taxable Amount:", val: formatINR(totalTaxable) },
        ...(isInterState
          ? [{ label: "Integrated GST (IGST 3%):", val: formatINR(invoice.igst || totalTax) }]
          : [
              { label: "Central GST (CGST 1.5%):", val: formatINR(invoice.cgst || totalTax / 2) },
              { label: "State GST (SGST 1.5%):", val: formatINR(invoice.sgst || totalTax / 2) },
            ]),
        { label: "GRAND TOTAL:", val: `Rs. ${formatINR(invoice.grandTotal)}`, isBold: true, isHighlight: true },
        { label: "Paid / Received:", val: `Rs. ${formatINR(invoice.paidAmount || 0)}` },
        { label: "Balance Amount Due:", val: `Rs. ${formatINR(invoice.balanceDue ?? 0)}`, isBold: true },
      ];

      doc.rect(rx, ry, rightColWidth, 110).lineWidth(0.5).strokeColor("#000000").stroke();

      totalRows.forEach((r) => {
        const rh = r.isHighlight ? 18 : 14;
        if (r.isHighlight) {
          doc.rect(rx, ry, rightColWidth, rh).fillColor("#FFFBEB").fill();
        }
        doc.fontSize(r.isBold ? 7.5 : 7).font(r.isBold ? "Helvetica-Bold" : "Helvetica").fillColor("#000000");
        doc.text(r.label, rx + 6, ry + 4);
        doc.text(r.val, rx + 60, ry + 4, { width: rightColWidth - 66, align: "right" });
        ry += rh;
      });

      // Signatory Box
      doc.rect(rx, ry, rightColWidth, 80).lineWidth(0.5).strokeColor("#000000").stroke();
      doc.fontSize(7).font("Helvetica-Bold").text(`For ${company?.legalName || company?.name}`, rx + 6, ry + 6, { width: rightColWidth - 12, align: "center" });
      doc.fontSize(6.5).font("Helvetica").text("Authorized Signatory", rx + 6, ry + 62, { width: rightColWidth - 12, align: "center" });

      // Clean single outer border enclosing the entire invoice document
      const docBottom = Math.max(y + 38, ry + 80);
      doc.rect(margin, margin, contentWidth, docBottom - margin).lineWidth(0.75).strokeColor("#000000").stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
