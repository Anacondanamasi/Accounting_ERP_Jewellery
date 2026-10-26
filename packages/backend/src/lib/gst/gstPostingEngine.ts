import { round2, type DocumentTaxSummary } from "./taxCalculator";
import type { PosEvaluationResult } from "./posEngine";
import type { PostingLine } from "../accounting";

export type GstDocumentType =
  | "INVOICE"
  | "BILL"
  | "EXPENSE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "ADVANCE_RECEIPT"
  | "ADVANCE_PAYMENT";

export interface GstControlAccounts {
  receivableId: number;
  payableId: number;
  salesId: number;
  purchaseId: number;
  outputGstId: number;
  inputGstId: number;
  outputCgstId?: number;
  outputSgstId?: number;
  outputIgstId?: number;
  outputCessId?: number;
  rcmOutputCgstId?: number;
  rcmOutputSgstId?: number;
  rcmOutputIgstId?: number;
  inputCgstId?: number;
  inputSgstId?: number;
  inputIgstId?: number;
  inputCessId?: number;
  inputRcmCgstId?: number;
  inputRcmSgstId?: number;
  inputRcmIgstId?: number;
  itcBlockedId?: number;
  roundOffId?: number;
  cashId?: number;
  bankId?: number;
  customerAdvanceId?: number;
  supplierAdvanceId?: number;
}

export interface GstPostingInput {
  documentType: GstDocumentType;
  documentNo: string;
  posResult: PosEvaluationResult;
  taxSummary: DocumentTaxSummary;
  accounts: GstControlAccounts;
  partyName?: string;
  salesAccountId?: number;     // Override default sales revenue
  purchaseAccountId?: number;  // Override default purchase/COGS
  paymentMethodAccountId?: number; // Cash / Bank account for expenses or cash bills
}

export const generateGstJournalPosting = (input: GstPostingInput): PostingLine[] => {
  const { documentType, documentNo, posResult, taxSummary, accounts } = input;
  const lines: PostingLine[] = [];

  const salesAcc = input.salesAccountId || accounts.salesId;
  const purchaseAcc = input.purchaseAccountId || accounts.purchaseId;

  // Resolve specific tax accounts with safe fallbacks to legacy control accounts
  const outCgstAcc = accounts.outputCgstId || accounts.outputGstId;
  const outSgstAcc = accounts.outputSgstId || accounts.outputGstId;
  const outIgstAcc = accounts.outputIgstId || accounts.outputGstId;
  const outCessAcc = accounts.outputCessId || accounts.outputGstId;

  const inCgstAcc = accounts.inputCgstId || accounts.inputGstId;
  const inSgstAcc = accounts.inputSgstId || accounts.inputGstId;
  const inIgstAcc = accounts.inputIgstId || accounts.inputGstId;
  const inCessAcc = accounts.inputCessId || accounts.inputGstId;

  const rcmOutCgstAcc = accounts.rcmOutputCgstId || outCgstAcc;
  const rcmOutSgstAcc = accounts.rcmOutputSgstId || outSgstAcc;
  const rcmOutIgstAcc = accounts.rcmOutputIgstId || outIgstAcc;

  const inRcmCgstAcc = accounts.inputRcmCgstId || inCgstAcc;
  const inRcmSgstAcc = accounts.inputRcmSgstId || inSgstAcc;
  const inRcmIgstAcc = accounts.inputRcmIgstId || inIgstAcc;

  const blockedItcAcc = accounts.itcBlockedId || purchaseAcc;
  const roundOffAcc = accounts.roundOffId || salesAcc;

  const { isInterstate, isZeroRated } = posResult;

  switch (documentType) {
    case "INVOICE": {
      // 1. Debit Accounts Receivable (Total Invoice Value)
      lines.push({
        accountId: accounts.receivableId,
        debit: taxSummary.grandTotal,
        credit: 0,
        narration: `Invoice ${documentNo}${input.partyName ? ` - ${input.partyName}` : ""}`,
      });

      // 2. Credit Sales Revenue (Taxable Value)
      lines.push({
        accountId: salesAcc,
        debit: 0,
        credit: taxSummary.taxableAmount,
        narration: `Sales revenue for ${documentNo}`,
      });

      // 3. Credit Output Tax lines
      if (!isZeroRated) {
        if (isInterstate) {
          if (taxSummary.igst > 0) {
            lines.push({
              accountId: outIgstAcc,
              debit: 0,
              credit: taxSummary.igst,
              narration: `Output IGST on ${documentNo} (POS: ${posResult.posStateCode})`,
            });
          }
        } else {
          if (taxSummary.cgst > 0) {
            lines.push({
              accountId: outCgstAcc,
              debit: 0,
              credit: taxSummary.cgst,
              narration: `Output CGST on ${documentNo}`,
            });
          }
          if (taxSummary.sgst > 0) {
            lines.push({
              accountId: outSgstAcc,
              debit: 0,
              credit: taxSummary.sgst,
              narration: `Output SGST on ${documentNo}`,
            });
          }
        }

        if (taxSummary.cess > 0) {
          lines.push({
            accountId: outCessAcc,
            debit: 0,
            credit: taxSummary.cess,
            narration: `Output Cess on ${documentNo}`,
          });
        }
      }

      // 4. Round-off adjustment
      if (Math.abs(taxSummary.roundOff) > 0) {
        if (taxSummary.roundOff > 0) {
          // Fraction was rounded up: credit round-off
          lines.push({
            accountId: roundOffAcc,
            debit: 0,
            credit: taxSummary.roundOff,
            narration: `Round-off adjustment on ${documentNo}`,
          });
        } else {
          // Fraction was rounded down: debit round-off
          lines.push({
            accountId: roundOffAcc,
            debit: Math.abs(taxSummary.roundOff),
            credit: 0,
            narration: `Round-off adjustment on ${documentNo}`,
          });
        }
      }
      break;
    }

    case "BILL": {
      // Check RCM
      const isRcmBill = taxSummary.lines.some((l) => l.isRcm);
      const isBlockedItcBill = taxSummary.lines.every((l) => l.itcEligibility === "BLOCKED_17_5" || l.itcEligibility === "INELIGIBLE");

      if (isRcmBill) {
        // RCM Purchase:
        // Dr Purchase (Taxable Amount)
        // Cr Accounts Payable (Taxable Amount)
        // Dr Input ITC on RCM (Tax Amount)
        // Cr RCM Output Tax Payable (Tax Amount - to be paid in cash)
        lines.push({
          accountId: purchaseAcc,
          debit: taxSummary.taxableAmount,
          credit: 0,
          narration: `RCM Purchase for ${documentNo}`,
        });

        lines.push({
          accountId: accounts.payableId,
          debit: 0,
          credit: taxSummary.taxableAmount,
          narration: `Payable to supplier for ${documentNo} (RCM)`,
        });

        if (isInterstate) {
          if (taxSummary.igst > 0) {
            lines.push({
              accountId: inRcmIgstAcc,
              debit: taxSummary.igst,
              credit: 0,
              narration: `Provisional RCM Input IGST on ${documentNo}`,
            });
            lines.push({
              accountId: rcmOutIgstAcc,
              debit: 0,
              credit: taxSummary.igst,
              narration: `RCM Output IGST Payable in cash on ${documentNo}`,
            });
          }
        } else {
          if (taxSummary.cgst > 0) {
            lines.push({
              accountId: inRcmCgstAcc,
              debit: taxSummary.cgst,
              credit: 0,
              narration: `Provisional RCM Input CGST on ${documentNo}`,
            });
            lines.push({
              accountId: rcmOutCgstAcc,
              debit: 0,
              credit: taxSummary.cgst,
              narration: `RCM Output CGST Payable in cash on ${documentNo}`,
            });
          }
          if (taxSummary.sgst > 0) {
            lines.push({
              accountId: inRcmSgstAcc,
              debit: taxSummary.sgst,
              credit: 0,
              narration: `Provisional RCM Input SGST on ${documentNo}`,
            });
            lines.push({
              accountId: rcmOutSgstAcc,
              debit: 0,
              credit: taxSummary.sgst,
              narration: `RCM Output SGST Payable in cash on ${documentNo}`,
            });
          }
        }
      } else if (isBlockedItcBill) {
        // Blocked / Ineligible ITC: Tax is capitalized into cost or posted to 17(5) expense
        lines.push({
          accountId: purchaseAcc,
          debit: taxSummary.taxableAmount,
          credit: 0,
          narration: `Purchase expense for ${documentNo}`,
        });

        if (taxSummary.taxTotal > 0) {
          lines.push({
            accountId: blockedItcAcc,
            debit: taxSummary.taxTotal,
            credit: 0,
            narration: `Ineligible / Blocked ITC u/s 17(5) on ${documentNo}`,
          });
        }

        lines.push({
          accountId: accounts.payableId,
          debit: 0,
          credit: taxSummary.grandTotal,
          narration: `Bill ${documentNo}${input.partyName ? ` - ${input.partyName}` : ""}`,
        });

        if (Math.abs(taxSummary.roundOff) > 0) {
          if (taxSummary.roundOff > 0) {
            lines.push({ accountId: roundOffAcc, debit: 0, credit: taxSummary.roundOff, narration: `Round-off on ${documentNo}` });
          } else {
            lines.push({ accountId: roundOffAcc, debit: Math.abs(taxSummary.roundOff), credit: 0, narration: `Round-off on ${documentNo}` });
          }
        }
      } else {
        // Standard Eligible ITC Purchase Bill:
        // Dr Purchase (Taxable Amount)
        // Dr Input CGST / SGST / IGST (Eligible ITC)
        // Cr Accounts Payable (Grand Total)
        lines.push({
          accountId: purchaseAcc,
          debit: taxSummary.taxableAmount,
          credit: 0,
          narration: `Purchase for ${documentNo}`,
        });

        if (isInterstate) {
          if (taxSummary.igst > 0) {
            lines.push({
              accountId: inIgstAcc,
              debit: taxSummary.igst,
              credit: 0,
              narration: `Input IGST on ${documentNo} (POS: ${posResult.posStateCode})`,
            });
          }
        } else {
          if (taxSummary.cgst > 0) {
            lines.push({
              accountId: inCgstAcc,
              debit: taxSummary.cgst,
              credit: 0,
              narration: `Input CGST on ${documentNo}`,
            });
          }
          if (taxSummary.sgst > 0) {
            lines.push({
              accountId: inSgstAcc,
              debit: taxSummary.sgst,
              credit: 0,
              narration: `Input SGST on ${documentNo}`,
            });
          }
        }

        if (taxSummary.cess > 0) {
          lines.push({
            accountId: inCessAcc,
            debit: taxSummary.cess,
            credit: 0,
            narration: `Input Cess on ${documentNo}`,
          });
        }

        lines.push({
          accountId: accounts.payableId,
          debit: 0,
          credit: taxSummary.grandTotal,
          narration: `Bill ${documentNo}${input.partyName ? ` - ${input.partyName}` : ""}`,
        });

        if (Math.abs(taxSummary.roundOff) > 0) {
          if (taxSummary.roundOff > 0) {
            lines.push({ accountId: roundOffAcc, debit: 0, credit: taxSummary.roundOff, narration: `Round-off on ${documentNo}` });
          } else {
            lines.push({ accountId: roundOffAcc, debit: Math.abs(taxSummary.roundOff), credit: 0, narration: `Round-off on ${documentNo}` });
          }
        }
      }
      break;
    }

    case "EXPENSE": {
      // Direct Expense paid from Bank/Cash with GST breakdown
      const paymentAcc = input.paymentMethodAccountId || accounts.bankId || accounts.cashId || accounts.payableId;

      lines.push({
        accountId: purchaseAcc,
        debit: taxSummary.taxableAmount,
        credit: 0,
        narration: `Expense: ${documentNo}`,
      });

      if (isInterstate) {
        if (taxSummary.igst > 0) {
          lines.push({
            accountId: inIgstAcc,
            debit: taxSummary.igst,
            credit: 0,
            narration: `Input IGST on expense ${documentNo}`,
          });
        }
      } else {
        if (taxSummary.cgst > 0) {
          lines.push({
            accountId: inCgstAcc,
            debit: taxSummary.cgst,
            credit: 0,
            narration: `Input CGST on expense ${documentNo}`,
          });
        }
        if (taxSummary.sgst > 0) {
          lines.push({
            accountId: inSgstAcc,
            debit: taxSummary.sgst,
            credit: 0,
            narration: `Input SGST on expense ${documentNo}`,
          });
        }
      }

      if (taxSummary.cess > 0) {
        lines.push({
          accountId: inCessAcc,
          debit: taxSummary.cess,
          credit: 0,
          narration: `Input Cess on expense ${documentNo}`,
        });
      }

      lines.push({
        accountId: paymentAcc,
        debit: 0,
        credit: taxSummary.grandTotal,
        narration: `Payment for expense ${documentNo}`,
      });

      if (Math.abs(taxSummary.roundOff) > 0) {
        if (taxSummary.roundOff > 0) {
          lines.push({ accountId: roundOffAcc, debit: 0, credit: taxSummary.roundOff, narration: `Round-off on expense ${documentNo}` });
        } else {
          lines.push({ accountId: roundOffAcc, debit: Math.abs(taxSummary.roundOff), credit: 0, narration: `Round-off on expense ${documentNo}` });
        }
      }
      break;
    }

    case "CREDIT_NOTE": {
      // Sales Return: Reverses original sales revenue and output tax
      // Dr Sales Returns (Taxable Amount)
      // Dr Output CGST / SGST / IGST (Tax Reversal)
      // Cr Accounts Receivable (Grand Total)
      lines.push({
        accountId: salesAcc,
        debit: taxSummary.taxableAmount,
        credit: 0,
        narration: `Sales return / credit note ${documentNo}`,
      });

      if (!isZeroRated) {
        if (isInterstate) {
          if (taxSummary.igst > 0) {
            lines.push({
              accountId: outIgstAcc,
              debit: taxSummary.igst,
              credit: 0,
              narration: `Output IGST reversal on credit note ${documentNo}`,
            });
          }
        } else {
          if (taxSummary.cgst > 0) {
            lines.push({
              accountId: outCgstAcc,
              debit: taxSummary.cgst,
              credit: 0,
              narration: `Output CGST reversal on credit note ${documentNo}`,
            });
          }
          if (taxSummary.sgst > 0) {
            lines.push({
              accountId: outSgstAcc,
              debit: taxSummary.sgst,
              credit: 0,
              narration: `Output SGST reversal on credit note ${documentNo}`,
            });
          }
        }

        if (taxSummary.cess > 0) {
          lines.push({
            accountId: outCessAcc,
            debit: taxSummary.cess,
            credit: 0,
            narration: `Output Cess reversal on credit note ${documentNo}`,
          });
        }
      }

      lines.push({
        accountId: accounts.receivableId,
        debit: 0,
        credit: taxSummary.grandTotal,
        narration: `Credit Note ${documentNo}${input.partyName ? ` - ${input.partyName}` : ""}`,
      });

      if (Math.abs(taxSummary.roundOff) > 0) {
        if (taxSummary.roundOff > 0) {
          lines.push({ accountId: roundOffAcc, debit: taxSummary.roundOff, credit: 0, narration: `Round-off on credit note ${documentNo}` });
        } else {
          lines.push({ accountId: roundOffAcc, debit: 0, credit: Math.abs(taxSummary.roundOff), narration: `Round-off on credit note ${documentNo}` });
        }
      }
      break;
    }

    case "DEBIT_NOTE": {
      // Purchase Return: Reverses purchase and input ITC
      // Dr Accounts Payable (Grand Total)
      // Cr Purchase / Expense (Taxable Amount)
      // Cr Input CGST / SGST / IGST (ITC Reversal)
      lines.push({
        accountId: accounts.payableId,
        debit: taxSummary.grandTotal,
        credit: 0,
        narration: `Debit Note ${documentNo}${input.partyName ? ` - ${input.partyName}` : ""}`,
      });

      lines.push({
        accountId: purchaseAcc,
        debit: 0,
        credit: taxSummary.taxableAmount,
        narration: `Purchase return / debit note ${documentNo}`,
      });

      if (isInterstate) {
        if (taxSummary.igst > 0) {
          lines.push({
            accountId: inIgstAcc,
            debit: 0,
            credit: taxSummary.igst,
            narration: `Input IGST reversal on debit note ${documentNo}`,
          });
        }
      } else {
        if (taxSummary.cgst > 0) {
          lines.push({
            accountId: inCgstAcc,
            debit: 0,
            credit: taxSummary.cgst,
            narration: `Input CGST reversal on debit note ${documentNo}`,
          });
        }
        if (taxSummary.sgst > 0) {
          lines.push({
            accountId: inSgstAcc,
            debit: 0,
            credit: taxSummary.sgst,
            narration: `Input SGST reversal on debit note ${documentNo}`,
          });
        }
      }

      if (taxSummary.cess > 0) {
        lines.push({
          accountId: inCessAcc,
          debit: 0,
          credit: taxSummary.cess,
          narration: `Input Cess reversal on debit note ${documentNo}`,
        });
      }

      if (Math.abs(taxSummary.roundOff) > 0) {
        if (taxSummary.roundOff > 0) {
          lines.push({ accountId: roundOffAcc, debit: 0, credit: taxSummary.roundOff, narration: `Round-off on debit note ${documentNo}` });
        } else {
          lines.push({ accountId: roundOffAcc, debit: Math.abs(taxSummary.roundOff), credit: 0, narration: `Round-off on debit note ${documentNo}` });
        }
      }
      break;
    }

    default:
      break;
  }

  // Filter zero lines and sanitize debits/credits
  const sanitized = lines
    .map((l) => ({
      ...l,
      debit: round2(Number(l.debit || 0)),
      credit: round2(Number(l.credit || 0)),
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  // Assert double-entry equality
  const totalDebit = round2(sanitized.reduce((sum, l) => sum + l.debit, 0));
  const totalCredit = round2(sanitized.reduce((sum, l) => sum + l.credit, 0));
  const discrepancy = round2(Math.abs(totalDebit - totalCredit));

  if (discrepancy > 0.05) {
    throw new Error(
      `GST Posting Engine Error: Unbalanced journal entry for ${documentNo}. Debits: ₹${totalDebit}, Credits: ₹${totalCredit}, Diff: ₹${discrepancy}`
    );
  }

  // Auto-absorb any petty sub-cent discrepancy into the round-off line if needed
  if (discrepancy > 0 && discrepancy <= 0.05) {
    if (totalDebit > totalCredit) {
      sanitized.push({
        accountId: roundOffAcc,
        debit: 0,
        credit: discrepancy,
        narration: "Auto precision balancing",
      });
    } else {
      sanitized.push({
        accountId: roundOffAcc,
        debit: discrepancy,
        credit: 0,
        narration: "Auto precision balancing",
      });
    }
  }

  return sanitized;
};
