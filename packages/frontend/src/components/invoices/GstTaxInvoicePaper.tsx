import { cn } from "@/lib/utils";
import { formatCurrency, formatWeight, formatDate, numberToWordsIndian } from "@/lib/formatters";

export interface GstTaxInvoicePaperProps {
  invoice: any;
  company?: any;
  customer?: any;
  bankAccount?: any;
  printId?: string;
  className?: string;
}

const cell = "border border-black p-1 align-top text-[11px] leading-snug text-black";
const headCell = "border border-black bg-neutral-100 p-1 text-[10px] font-semibold uppercase leading-snug text-black";
const numCell = cn(cell, "text-right tabular-nums font-mono");

const GST_STATE_NAMES: Record<string, string> = {
  "01": "Jammu and Kashmir",
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
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

function stateLabel(code: string | null | undefined): string {
  const normalized = (code ?? "").trim().slice(0, 2);
  if (!normalized) return "";
  const name = GST_STATE_NAMES[normalized];
  return name ? `${normalized} - ${name}` : normalized;
}

function getStateInfo(gstin?: string | null, fallbackState?: string | null): { state: string; code: string } {
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    if (GST_STATE_NAMES[code]) {
      return { state: GST_STATE_NAMES[code], code };
    }
  }
  return { state: fallbackState || "Gujarat", code: "24" };
}

function formatInr(val: number | string | undefined | null): string {
  const num = Number(val || 0);
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PartyAddressBlock({
  title,
  name,
  address,
  gstin,
  pan,
  stateCode,
  phone,
  email,
}: {
  title: string;
  name: string;
  address?: string;
  gstin: string | null;
  pan?: string;
  stateCode: string;
  phone?: string;
  email?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase">{title}</p>
      <p className="font-semibold text-sm">M/s {name}</p>
      {address ? (
        <p className="whitespace-pre-line text-[10px]">{address}</p>
      ) : (
        <p className="italic text-neutral-600 text-[10px]">Address not recorded</p>
      )}
      <p>
        GSTIN/UIN: {gstin || "Unregistered"}
        {pan ? ` · PAN: ${pan}` : ""}
      </p>
      <p>State: {stateLabel(stateCode) || stateCode}</p>
      {phone || email ? <p className="text-[10px]">{[phone, email].filter(Boolean).join(" · ")}</p> : null}
    </div>
  );
}

export function GstTaxInvoicePaper({
  invoice,
  company: propCompany,
  customer: propCustomer,
  bankAccount: propBankAccount,
  printId = "voucher-print-root",
  className,
}: GstTaxInvoicePaperProps) {
  const company = propCompany || invoice.company || {};
  const customer = propCustomer || invoice.customer || {};
  const bankAccount = propBankAccount || invoice.bankAccount || {};
  const lines: any[] = invoice.lines || [];

  const companyState = getStateInfo(company.gstin, company.state);
  const customerState = getStateInfo(customer.gstin, customer.state);

  const isInterState =
    Number(invoice.igst || 0) > 0 ||
    (companyState.code && customerState.code && companyState.code !== customerState.code);

  const cols = isInterState ? 12 : 14;

  // HSN Breakdown
  const hsnSummary: Record<string, { hsn: string; taxable: number; cgst: number; sgst: number; igst: number; rate: number }> = {};
  lines.forEach((line) => {
    const hsn = line.hsnCode || "7113";
    const amt = Number(line.amount || 0);
    const rate = Number(line.gstPct || 3);
    if (!hsnSummary[hsn]) {
      hsnSummary[hsn] = { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0, rate };
    }
    hsnSummary[hsn].taxable += amt;
    if (isInterState) {
      hsnSummary[hsn].igst += (amt * rate) / 100;
    } else {
      hsnSummary[hsn].cgst += (amt * (rate / 2)) / 100;
      hsnSummary[hsn].sgst += (amt * (rate / 2)) / 100;
    }
  });

  const totalGrossWt = lines.reduce((sum, l) => sum + Number(l.grossWt || l.netWt || 0), 0);
  const totalNetWt = lines.reduce((sum, l) => sum + Number(l.netWt || 0), 0);
  const wordsAmount = numberToWordsIndian(Number(invoice.grandTotal || 0));

  const companyAddressParts = [
    company.addressLine1,
    company.addressLine2,
    [company.city, company.pinCode].filter(Boolean).join(" - "),
  ].filter(Boolean);

  const customerAddress = [customer.city, customer.state || customerState.state].filter(Boolean).join(", ");
  const shipAddress = customerAddress || "Direct Store Counter Delivery";

  return (
    <div
      className={cn(
        "gst-invoice-paper mx-auto w-full max-w-[210mm] bg-white p-2 text-black print:p-0 print:max-w-none print:w-full",
        className,
      )}
      id={printId || "gst-tax-invoice"}
    >
      <table className="w-full border-collapse border border-black text-[11px]">
        <tbody>
          {/* Header Row */}
          <tr>
            <td className={cell} colSpan={cols}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase text-black">
                      {company.legalName || company.name || "MANAV JEWELLERS"}
                    </p>
                    {company.name && company.legalName && company.name !== company.legalName && (
                      <p className="text-[10px] text-neutral-600 font-medium">{company.name}</p>
                    )}
                    {companyAddressParts.length > 0 ? (
                      companyAddressParts.map((line, idx) => (
                        <p key={idx} className="text-[10px]">
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="italic text-neutral-600 text-[10px]">Company address not recorded</p>
                    )}
                    <p>
                      GSTIN/UIN: {company.gstin && company.gstin !== "PENDING" ? company.gstin : "Unregistered"}
                      {company.pan ? ` · PAN: ${company.pan}` : ""}
                    </p>
                    <p>State: {stateLabel(companyState.code) || companyState.code}</p>
                    {company.phone || company.email ? (
                      <p className="text-[10px]">
                        {[company.phone ? `Phone: ${company.phone}` : "", company.email ? `Email: ${company.email}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold uppercase tracking-wide text-black">
                    TAX INVOICE
                  </p>
                </div>
              </div>
            </td>
          </tr>

          {/* Invoice No & Dates Row */}
          <tr>
            <td className={headCell}>Invoice No.</td>
            <td className={cn(cell, "font-mono font-bold")} colSpan={2}>
              {invoice.invoiceNo}
            </td>
            <td className={headCell}>Dated</td>
            <td className={cn(cell, "font-mono")} colSpan={isInterState ? 2 : 3}>
              {formatDate(invoice.date, "display")}
            </td>
            <td className={headCell}>Due Date</td>
            <td className={cn(cell, "font-mono")} colSpan={isInterState ? 5 : 6}>
              {formatDate(invoice.dueDate || invoice.date, "display")}
            </td>
          </tr>

          {/* Place of Supply Row */}
          <tr>
            <td className={headCell}>Place of Supply</td>
            <td className={cell} colSpan={isInterState ? 2 : 3}>
              {stateLabel(customerState.code) || "—"}
            </td>
            <td className={headCell}>Mode/Terms of Payment</td>
            <td className={cell} colSpan={isInterState ? 8 : 9}>
              Credit / Bank Transfer
            </td>
          </tr>

          {/* Optional Daily Metal Rates Row */}
          {(invoice.goldRate24k || invoice.goldRate22k || invoice.goldRate18k) && (
            <tr>
              <td className={headCell}>Metal Rates</td>
              <td className={cell} colSpan={cols - 1}>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  {invoice.goldRate24k && <span>24K: ₹{formatInr(invoice.goldRate24k)}/g</span>}
                  {invoice.goldRate22k && <span>22K: ₹{formatInr(invoice.goldRate22k)}/g</span>}
                  {invoice.goldRate18k && <span>18K: ₹{formatInr(invoice.goldRate18k)}/g</span>}
                </div>
              </td>
            </tr>
          )}

          {/* Party Address Blocks (Billed to & Shipped to) */}
          <tr>
            <td className={cell} colSpan={Math.floor(cols / 2)}>
              <PartyAddressBlock
                title="Billed to"
                name={customer.name || invoice.customerName || "Consumer"}
                address={customerAddress}
                gstin={customer.gstin}
                pan={customer.pan}
                stateCode={customerState.code}
                phone={customer.mobile}
                email={customer.email}
              />
            </td>
            <td className={cell} colSpan={cols - Math.floor(cols / 2)}>
              <PartyAddressBlock
                title="Shipped to"
                name={customer.name || invoice.customerName || "Consumer"}
                address={shipAddress}
                gstin={customer.gstin}
                pan={customer.pan}
                stateCode={customerState.code}
                phone={customer.mobile}
                email={customer.email}
              />
            </td>
          </tr>

          {/* Item Headers */}
          <tr>
            <td className={headCell}>Sr</td>
            <td className={headCell} colSpan={2}>
              Description of Goods
            </td>
            <td className={headCell}>HSN/SAC</td>
            <td className={cn(headCell, "text-right")}>Gross (g)</td>
            <td className={cn(headCell, "text-right")}>Net (g)</td>
            <td className={cn(headCell, "text-right")}>Rate</td>
            <td className={cn(headCell, "text-right")}>Making</td>
            <td className={cn(headCell, "text-right")}>Taxable</td>
            {isInterState ? (
              <>
                <td className={cn(headCell, "text-right")}>IGST %</td>
                <td className={cn(headCell, "text-right")}>IGST Amt</td>
              </>
            ) : (
              <>
                <td className={cn(headCell, "text-right")}>CGST %</td>
                <td className={cn(headCell, "text-right")}>CGST Amt</td>
                <td className={cn(headCell, "text-right")}>SGST %</td>
                <td className={cn(headCell, "text-right")}>SGST Amt</td>
              </>
            )}
            <td className={cn(headCell, "text-right")}>Amount</td>
          </tr>

          {/* Item Rows */}
          {lines.map((line, idx) => {
            const taxable = Number(line.amount || 0);
            const rate = Number(line.gstPct || 3);
            const cgstAmt = isInterState ? 0 : (taxable * (rate / 2)) / 100;
            const sgstAmt = isInterState ? 0 : (taxable * (rate / 2)) / 100;
            const igstAmt = isInterState ? (taxable * rate) / 100 : 0;
            const lineTotal = Number(line.total || 0);

            return (
              <tr key={line.id || idx}>
                <td className={cn(cell, "text-center")}>{idx + 1}</td>
                <td className={cell} colSpan={2}>
                  <p className="font-semibold">{line.description || "Jewellery Item"}</p>
                  <p className="text-[9px] text-neutral-600 font-mono">
                    {[line.karat ? `Purity: ${line.karat}` : "", line.huid ? `HUID: ${line.huid}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </td>
                <td className={cn(cell, "font-mono")}>{line.hsnCode || "7113"}</td>
                <td className={numCell}>{formatWeight(line.grossWt || line.netWt, "g")}</td>
                <td className={numCell}>{formatWeight(line.netWt, "g")}</td>
                <td className={numCell}>{formatInr(line.ratePerGram)}</td>
                <td className={numCell}>{formatInr(line.makingAmount)}</td>
                <td className={numCell}>{formatInr(taxable)}</td>
                {isInterState ? (
                  <>
                    <td className={numCell}>{rate}%</td>
                    <td className={numCell}>{formatInr(igstAmt)}</td>
                  </>
                ) : (
                  <>
                    <td className={numCell}>{rate / 2}%</td>
                    <td className={numCell}>{formatInr(cgstAmt)}</td>
                    <td className={numCell}>{rate / 2}%</td>
                    <td className={numCell}>{formatInr(sgstAmt)}</td>
                  </>
                )}
                <td className={numCell}>{formatInr(lineTotal)}</td>
              </tr>
            );
          })}

          {/* Total Row */}
          <tr className="font-semibold">
            <td className={cell} colSpan={4}>
              Total
            </td>
            <td className={numCell}>{formatWeight(totalGrossWt, "g")}</td>
            <td className={numCell}>{formatWeight(totalNetWt, "g")}</td>
            <td className={cell} colSpan={2} />
            <td className={numCell}>{formatInr(invoice.taxableAmount)}</td>
            {isInterState ? (
              <>
                <td className={cell} />
                <td className={numCell}>{formatInr(invoice.igst)}</td>
              </>
            ) : (
              <>
                <td className={cell} />
                <td className={numCell}>{formatInr(invoice.cgst)}</td>
                <td className={cell} />
                <td className={numCell}>{formatInr(invoice.sgst)}</td>
              </>
            )}
            <td className={numCell}>{formatInr(invoice.grandTotal)}</td>
          </tr>

          {/* HSN Summary (Left) & Financials (Right) */}
          <tr>
            <td className={cell} colSpan={isInterState ? 6 : 7}>
              <p className="mb-1 text-[10px] font-semibold uppercase">
                HSN/SAC Summary
              </p>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr>
                    <td className={headCell}>HSN/SAC</td>
                    <td className={cn(headCell, "text-right")}>Taxable Value</td>
                    {isInterState ? (
                      <td className={cn(headCell, "text-right")}>IGST</td>
                    ) : (
                      <>
                        <td className={cn(headCell, "text-right")}>CGST</td>
                        <td className={cn(headCell, "text-right")}>SGST</td>
                      </>
                    )}
                    <td className={cn(headCell, "text-right")}>Total Tax</td>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(hsnSummary).map((row) => (
                    <tr key={row.hsn}>
                      <td className={cell}>{row.hsn}</td>
                      <td className={numCell}>{formatInr(row.taxable)}</td>
                      {isInterState ? (
                        <td className={numCell}>{formatInr(row.igst)}</td>
                      ) : (
                        <>
                          <td className={numCell}>{formatInr(row.cgst)}</td>
                          <td className={numCell}>{formatInr(row.sgst)}</td>
                        </>
                      )}
                      <td className={numCell}>{formatInr(row.cgst + row.sgst + row.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-2">
                <span className="font-semibold">Amount Chargeable (in words): </span>
                {wordsAmount}
              </p>
              {invoice.notes && (
                <p className="mt-1">
                  <span className="font-semibold">Narration: </span>
                  {invoice.notes}
                </p>
              )}
            </td>

            <td className={cell} colSpan={cols - (isInterState ? 6 : 7)}>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-0.5">Taxable Amount</td>
                    <td className="py-0.5 text-right tabular-nums">{formatInr(invoice.taxableAmount)}</td>
                  </tr>
                  {Number(invoice.discount || 0) > 0 && (
                    <tr>
                      <td className="py-0.5">Bill Discount</td>
                      <td className="py-0.5 text-right tabular-nums text-red-600">-{formatInr(invoice.discount)}</td>
                    </tr>
                  )}
                  {isInterState ? (
                    <tr>
                      <td className="py-0.5">IGST</td>
                      <td className="py-0.5 text-right tabular-nums">{formatInr(invoice.igst)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td className="py-0.5">CGST</td>
                        <td className="py-0.5 text-right tabular-nums">{formatInr(invoice.cgst)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5">SGST</td>
                        <td className="py-0.5 text-right tabular-nums">{formatInr(invoice.sgst)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-black font-bold">
                    <td className="pt-1">Grand Total</td>
                    <td className="pt-1 text-right tabular-nums">
                      ₹{formatInr(invoice.grandTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Paid</td>
                    <td className="py-0.5 text-right tabular-nums font-semibold text-emerald-800">
                      {formatInr(invoice.paidAmount)}
                    </td>
                  </tr>
                  <tr className="border-t border-neutral-300 font-bold">
                    <td className="py-0.5">Outstanding</td>
                    <td className="py-0.5 text-right tabular-nums text-red-700">
                      ₹{formatInr(invoice.balanceDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Bank Details, Terms & Signatures */}
          <tr>
            <td className={cell} colSpan={isInterState ? 6 : 7}>
              <div>
                <p className="text-[10px] font-semibold uppercase">Company&apos;s Bank Details</p>
                <p>Bank: {bankAccount?.name || "HDFC Bank"}</p>
                <p>A/c No.: {bankAccount?.code || "50200088991122"}</p>
                <p>IFSC: HDFC0001234</p>
              </div>
              <p className="mt-2 whitespace-pre-line text-[10px] text-neutral-700">
                Goods once sold will not be taken back. Gold jewellery sold is hallmarked as per BIS standards. Subject to local jurisdiction. Whether tax is payable on reverse charge - No.
              </p>
              <p className="mt-1 text-[10px]">Reverse Charge: No</p>
            </td>
            <td className={cn(cell, "align-bottom text-right")} colSpan={cols - (isInterState ? 6 : 7)}>
              <p className="font-semibold">For {company.legalName || company.name || "MANAV JEWELLERS"}</p>
              <div className="mt-6 border-t border-black pt-1">Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
