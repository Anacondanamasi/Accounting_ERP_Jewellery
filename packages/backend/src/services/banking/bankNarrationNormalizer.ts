/**
 * Indian Bank Narration Normalizer & Channel Extractor
 * Pure, deterministic parser for Indian banking statement lines.
 */

export type IndianBankChannel =
  | "UPI"
  | "NEFT"
  | "IMPS"
  | "RTGS"
  | "POS"
  | "ATM"
  | "CHEQUE"
  | "ECS_NACH"
  | "CHARGES"
  | "INTEREST"
  | "TAX_CHALLAN"
  | "OTHER";

export interface ParsedNarrationDetails {
  channel: IndianBankChannel;
  rawNarration: string;
  cleanedDescription: string;
  referenceOrUtr?: string;
  counterpartyName?: string;
  vpa?: string;
  merchant?: string;
  isBankCharge: boolean;
  isInterestCredit: boolean;
  isTaxPayment: boolean;
}

export class BankNarrationNormalizer {
  /**
   * Normalizes whitespace and basic punctuation
   */
  public static cleanText(text: string): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   * Cleans counterparty name by removing common routing prefixes/suffixes
   */
  public static cleanPartyName(name: string): string {
    if (!name) return "";
    let cleaned = name.trim();

    // Remove bank branch cities and trailing noise often appended in Indian statements
    cleaned = cleaned.replace(/[-/](mumbai|delhi|bengaluru|bangalore|kolkata|chennai|ahmedabad|hyderabad|pune|surat|jaipur)$/i, "");
    cleaned = cleaned.replace(/^(p2a|p2p|cr|dr|by|to)[-/ ]+/i, "");
    cleaned = cleaned.replace(/[-/ ]+(p2a|p2p|cr|dr)$/i, "");

    return cleaned.trim();
  }

  /**
   * Parse Indian bank statement narration into structured channel & counterparty details
   */
  public static parse(raw: string): ParsedNarrationDetails {
    const rawNarration = this.cleanText(raw);
    const upper = rawNarration.toUpperCase();

    // 1. UPI: e.g. "UPI/428910293810/SWIGGY/swiggy@axis/Payment" or "UPI-428910293810-RAMESH-ramesh@okicici"
    if (upper.includes("UPI/") || upper.startsWith("UPI-") || upper.includes("/UPI/") || upper.includes("UPI/")) {
      const parts = rawNarration.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
      let ref: string | undefined;
      let counterparty: string | undefined;
      let vpa: string | undefined;

      for (const part of parts) {
        if (/^\d{8,14}$/.test(part) && !ref) {
          ref = part;
        } else if (part.includes("@") && !vpa) {
          vpa = part.toLowerCase();
        } else if (part.length > 2 && !ref && !counterparty && !/^(UPI|P2A|P2P|CR|DR|PAYMENT|MUMBAI)$/i.test(part)) {
          counterparty = part;
        } else if (part.length > 2 && ref && !counterparty && !part.includes("@") && !/^(PAYMENT|TRANSFER|CR|DR)$/i.test(part)) {
          counterparty = part;
        }
      }

      const party = this.cleanPartyName(counterparty || (vpa ? vpa.split("@")[0] : "UPI Counterparty"));
      return {
        channel: "UPI",
        rawNarration,
        cleanedDescription: party ? `UPI - ${party}` : rawNarration,
        referenceOrUtr: ref,
        counterpartyName: party,
        vpa,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 2. NEFT: e.g. "NEFT-AXSK23091823901-ACME JEWELS-MUMBAI" or "NEFT/N1029301290/ACME JEWELS"
    if (upper.includes("NEFT") && !upper.includes("NEFT CHG")) {
      const match = rawNarration.match(/NEFT[-/ ]+([A-Za-z0-9]+)[-/ ]+([^-\/]+)(?:[-/ ]+(.*))?/i);
      const utr = match ? match[1].trim() : undefined;
      const party = match ? this.cleanPartyName(match[2]) : undefined;

      return {
        channel: "NEFT",
        rawNarration,
        cleanedDescription: party ? `NEFT - ${party}` : rawNarration,
        referenceOrUtr: utr,
        counterpartyName: party,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 3. IMPS: e.g. "IMPS/P2A/402910293012/SHARMA/SBI" or "IMPS-402910293012-SHARMA"
    if (upper.includes("IMPS") && !upper.includes("IMPS CHG")) {
      const match = rawNarration.match(/IMPS[-/ ]+(?:P2A|P2P|RET)?[-/ ]*([0-9]{10,14})[-/ ]+([^-\/]+)/i);
      const ref = match ? match[1].trim() : undefined;
      const party = match ? this.cleanPartyName(match[2]) : undefined;

      return {
        channel: "IMPS",
        rawNarration,
        cleanedDescription: party ? `IMPS - ${party}` : rawNarration,
        referenceOrUtr: ref,
        counterpartyName: party,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 4. RTGS: e.g. "RTGS/HDFCR520240910001/RELIANCE RETAIL" or "RTGS-HDFCR520240910001-RELIANCE"
    if (upper.includes("RTGS")) {
      const match = rawNarration.match(/RTGS[-/ ]+([A-Za-z0-9]+)[-/ ]+([^-\/]+)/i);
      const ref = match ? match[1].trim() : undefined;
      const party = match ? this.cleanPartyName(match[2]) : undefined;

      return {
        channel: "RTGS",
        rawNarration,
        cleanedDescription: party ? `RTGS - ${party}` : rawNarration,
        referenceOrUtr: ref,
        counterpartyName: party,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 5. POS / Card / E-Commerce: e.g. "POS 40128910 TANISHQ MUMBAI IN" or "ECOM PUR/AMAZON/49102"
    if (upper.startsWith("POS ") || upper.includes("POS/") || upper.includes("ECOM PUR") || upper.includes("SWIPE")) {
      const match = rawNarration.match(/(?:POS|ECOM PUR|SWIPE)[-/ ]+(?:[0-9]+[-/ ]+)?([^-\/]+)/i);
      const merchant = match ? this.cleanPartyName(match[1]) : undefined;

      return {
        channel: "POS",
        rawNarration,
        cleanedDescription: merchant ? `Card Payment - ${merchant}` : rawNarration,
        counterpartyName: merchant,
        merchant,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 6. ATM Withdrawal: e.g. "ATM-WDL/KOTAK/MUMBAI/4910" or "NFS*ATM WDL*CASH"
    if (upper.includes("ATM") && (upper.includes("WDL") || upper.includes("CASH") || upper.includes("DEB"))) {
      return {
        channel: "ATM",
        rawNarration,
        cleanedDescription: "Cash Withdrawal at ATM",
        counterpartyName: "Self / Cash",
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 7. Cheque: e.g. "CHQ DEP 000142", "CHEQUE TRF 000249", "CLG/CHQ/001249"
    if (upper.includes("CHQ") || upper.includes("CHEQUE") || upper.includes("CLG")) {
      const match = rawNarration.match(/(?:CHQ|CHEQUE|CLG)[-/ ]+(?:DEP|TRF|NO)?[-/ ]*([0-9]{4,8})/i);
      const chqNo = match ? match[1] : undefined;

      return {
        channel: "CHEQUE",
        rawNarration,
        cleanedDescription: chqNo ? `Cheque #${chqNo}` : rawNarration,
        referenceOrUtr: chqNo,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 8. ECS / NACH: e.g. "ACH-DEB/BAJAJ FINANCE/492019" or "ECS/TATA CAPITAL/001"
    if (upper.includes("ACH-") || upper.includes("ACH/") || upper.includes("ECS/") || upper.includes("NACH/")) {
      const match = rawNarration.match(/(?:ACH|ECS|NACH)[-/ ]+(?:DEB|CR)?[-/ ]*([^-\/]+)/i);
      const mandator = match ? this.cleanPartyName(match[1]) : undefined;

      return {
        channel: "ECS_NACH",
        rawNarration,
        cleanedDescription: mandator ? `Auto-Debit - ${mandator}` : rawNarration,
        counterpartyName: mandator,
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 9. Bank Processing & Service Charges (Folio, SMS, Consolidated, Annual Fee)
    if (
      upper.includes("CHG") ||
      upper.includes("CHARGE") ||
      upper.includes("FOLIO") ||
      upper.includes("ANNUAL FEE") ||
      upper.includes("SMS CHG") ||
      upper.includes("GST ON") ||
      upper.includes("MDR") ||
      upper.includes("DEBIT CARD AMC")
    ) {
      return {
        channel: "CHARGES",
        rawNarration,
        cleanedDescription: "Bank Charges / Processing Fee",
        counterpartyName: "Bank",
        isBankCharge: true,
        isInterestCredit: false,
        isTaxPayment: false,
      };
    }

    // 10. Interest Credited: e.g. "INT.PD", "INT CR FOR Q1", "INTEREST CREDIT"
    if (upper.includes("INT.PD") || upper.includes("INTEREST CR") || upper.includes("INT CR") || upper.includes("INTEREST CREDIT")) {
      return {
        channel: "INTEREST",
        rawNarration,
        cleanedDescription: "Bank Savings / Deposit Interest Credited",
        counterpartyName: "Bank",
        isBankCharge: false,
        isInterestCredit: true,
        isTaxPayment: false,
      };
    }

    // 11. Tax Challan: e.g. "GST CPIN 2409102930102" or "CHALLAN 281 TDS PMT"
    if (
      upper.includes("CPIN") ||
      upper.includes("CHALLAN 281") ||
      upper.includes("ITNS 281") ||
      upper.includes("CBIC") ||
      (upper.includes("GST") && upper.includes("CHALLAN"))
    ) {
      return {
        channel: "TAX_CHALLAN",
        rawNarration,
        cleanedDescription: upper.includes("GST") ? "GST Government Challan Payment" : "TDS / Income Tax Challan Payment",
        counterpartyName: upper.includes("GST") ? "GST Department" : "Income Tax Department",
        isBankCharge: false,
        isInterestCredit: false,
        isTaxPayment: true,
      };
    }

    // Default Fallback
    return {
      channel: "OTHER",
      rawNarration,
      cleanedDescription: rawNarration,
      isBankCharge: false,
      isInterestCredit: false,
      isTaxPayment: false,
    };
  }
}
