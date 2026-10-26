import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BankNarrationNormalizer } from "../bankNarrationNormalizer";
import { BankRulesEngine, type RuleConditionDef, type BankFeedLineContext } from "../bankRulesEngine";

describe("Bank Rules Engine & Indian Narration Parser", () => {
  describe("Indian Narration Normalizer", () => {
    it("parses UPI transaction narrations with VPA and counterparty", () => {
      const parsed = BankNarrationNormalizer.parse("UPI/428910293810/SWIGGY/swiggy@axis/Payment");
      assert.equal(parsed.channel, "UPI");
      assert.equal(parsed.referenceOrUtr, "428910293810");
      assert.equal(parsed.counterpartyName, "SWIGGY");
      assert.equal(parsed.vpa, "swiggy@axis");
      assert.equal(parsed.cleanedDescription, "UPI - SWIGGY");
    });

    it("parses NEFT transactions with UTR and beneficiary name", () => {
      const parsed = BankNarrationNormalizer.parse("NEFT-AXSK23091823901-ACME JEWELS-MUMBAI");
      assert.equal(parsed.channel, "NEFT");
      assert.equal(parsed.referenceOrUtr, "AXSK23091823901");
      assert.equal(parsed.counterpartyName, "ACME JEWELS");
      assert.equal(parsed.cleanedDescription, "NEFT - ACME JEWELS");
    });

    it("parses IMPS transactions with reference and party name", () => {
      const parsed = BankNarrationNormalizer.parse("IMPS/P2A/402910293012/SHARMA/SBI");
      assert.equal(parsed.channel, "IMPS");
      assert.equal(parsed.referenceOrUtr, "402910293012");
      assert.equal(parsed.counterpartyName, "SHARMA");
      assert.equal(parsed.cleanedDescription, "IMPS - SHARMA");
    });

    it("parses POS card purchases and extracts merchant", () => {
      const parsed = BankNarrationNormalizer.parse("POS 40128910 TANISHQ JEWELLERY MUMBAI");
      assert.equal(parsed.channel, "POS");
      assert.ok(parsed.merchant?.includes("TANISHQ JEWELLERY"));
    });

    it("identifies ATM cash withdrawals", () => {
      const parsed = BankNarrationNormalizer.parse("ATM-WDL/KOTAK/MUMBAI/4910");
      assert.equal(parsed.channel, "ATM");
      assert.equal(parsed.counterpartyName, "Self / Cash");
      assert.equal(parsed.cleanedDescription, "Cash Withdrawal at ATM");
    });

    it("detects bank processing charges with 18% GST indicator", () => {
      const parsed = BankNarrationNormalizer.parse("FOLIO CHG + 18% GST");
      assert.equal(parsed.channel, "CHARGES");
      assert.equal(parsed.isBankCharge, true);
    });

    it("detects bank interest credit", () => {
      const parsed = BankNarrationNormalizer.parse("INT.PD ON SAVINGS ACC");
      assert.equal(parsed.channel, "INTEREST");
      assert.equal(parsed.isInterestCredit, true);
    });

    it("detects GST government tax challan payment", () => {
      const parsed = BankNarrationNormalizer.parse("GST CPIN 2409102930102 ONLINE PMT");
      assert.equal(parsed.channel, "TAX_CHALLAN");
      assert.equal(parsed.isTaxPayment, true);
      assert.equal(parsed.counterpartyName, "GST Department");
    });
  });

  describe("Condition Evaluator", () => {
    const sampleLine: BankFeedLineContext = {
      bankAccountId: 10,
      txnDate: "2025-05-15",
      descriptionRaw: "UPI/510293810293/AMAZON SELLER/amazon@apl/Order",
      descriptionNormalized: "upi/510293810293/amazon seller/amazon@apl/order",
      amount: -2500.5,
      reference: "510293810293",
    };
    const parsed = BankNarrationNormalizer.parse(sampleLine.descriptionRaw);

    it("evaluates CONTAINS and DOES_NOT_CONTAIN operators", () => {
      const cond1: RuleConditionDef = { field: "description", operator: "CONTAINS", value: "AMAZON" };
      assert.equal(BankRulesEngine.evaluateCondition(cond1, sampleLine, parsed), true);

      const cond2: RuleConditionDef = { field: "description", operator: "DOES_NOT_CONTAIN", value: "FLIPKART" };
      assert.equal(BankRulesEngine.evaluateCondition(cond2, sampleLine, parsed), true);
    });

    it("evaluates STARTS_WITH and ENDS_WITH operators", () => {
      const cond1: RuleConditionDef = { field: "bankText", operator: "STARTS_WITH", value: "UPI" };
      assert.equal(BankRulesEngine.evaluateCondition(cond1, sampleLine, parsed), true);

      const cond2: RuleConditionDef = { field: "bankText", operator: "ENDS_WITH", value: "Order" };
      assert.equal(BankRulesEngine.evaluateCondition(cond2, sampleLine, parsed), true);
    });

    it("evaluates MATCHES_REGEX operator safely", () => {
      const cond: RuleConditionDef = { field: "reference", operator: "MATCHES_REGEX", value: "^\\d{12}$" };
      assert.equal(BankRulesEngine.evaluateCondition(cond, sampleLine, parsed), true);
    });

    it("evaluates amount operators: EQUALS, GREATER_THAN, LESS_THAN, BETWEEN", () => {
      const eq: RuleConditionDef = { field: "amount", operator: "EQUALS", value: 2500.5 };
      assert.equal(BankRulesEngine.evaluateCondition(eq, sampleLine, parsed), true);

      const gt: RuleConditionDef = { field: "amount", operator: "GREATER_THAN", value: 2000 };
      assert.equal(BankRulesEngine.evaluateCondition(gt, sampleLine, parsed), true);

      const lt: RuleConditionDef = { field: "amount", operator: "LESS_THAN", value: 3000 };
      assert.equal(BankRulesEngine.evaluateCondition(lt, sampleLine, parsed), true);

      const between: RuleConditionDef = { field: "amount", operator: "BETWEEN", value: 2000, value2: 3000 };
      assert.equal(BankRulesEngine.evaluateCondition(between, sampleLine, parsed), true);
    });

    it("respects ALL vs ANY match modes", () => {
      const ruleAll = {
        applyToDirection: "MONEY_OUT",
        matchMode: "ALL",
        conditionsJson: JSON.stringify([
          { field: "description", operator: "CONTAINS", value: "AMAZON" },
          { field: "amount", operator: "GREATER_THAN", value: 1000 },
        ]),
      };
      assert.equal(BankRulesEngine.matchesRule(ruleAll, sampleLine, parsed), true);

      const ruleAllFail = {
        applyToDirection: "MONEY_OUT",
        matchMode: "ALL",
        conditionsJson: JSON.stringify([
          { field: "description", operator: "CONTAINS", value: "AMAZON" },
          { field: "description", operator: "CONTAINS", value: "NOT_PRESENT" },
        ]),
      };
      assert.equal(BankRulesEngine.matchesRule(ruleAllFail, sampleLine, parsed), false);

      const ruleAnyPass = {
        applyToDirection: "MONEY_OUT",
        matchMode: "ANY",
        conditionsJson: JSON.stringify([
          { field: "description", operator: "CONTAINS", value: "NOT_PRESENT" },
          { field: "description", operator: "CONTAINS", value: "AMAZON" },
        ]),
      };
      assert.equal(BankRulesEngine.matchesRule(ruleAnyPass, sampleLine, parsed), true);
    });
  });

  describe("Split Calculations", () => {
    it("calculates percentage splits with exact paise rounding", () => {
      const rule = {
        hasSplits: true,
        splitsJson: JSON.stringify([
          { position: 0, mode: "PERCENTAGE", value: 60, accountId: 5001 },
          { position: 1, mode: "PERCENTAGE", value: 40, accountId: 5002 },
        ]),
      };

      const splits = BankRulesEngine.resolveSplits(rule, 1000);
      assert.equal(splits.length, 2);
      assert.equal(splits[0].amount, 600);
      assert.equal(splits[1].amount, 400);
    });

    it("resolves remainder split line correctly", () => {
      const rule = {
        hasSplits: true,
        splitsJson: JSON.stringify([
          { position: 0, mode: "FIXED_AMOUNT", value: 700, accountId: 5001 },
          { position: 1, mode: "REMAINDER", value: 0, accountId: 5002 },
        ]),
      };

      const splits = BankRulesEngine.resolveSplits(rule, 1000);
      assert.equal(splits.length, 2);
      assert.equal(splits[0].amount, 700);
      assert.equal(splits[1].amount, 300);
    });
  });

  describe("Auto-Add Safety Ceilings", () => {
    it("blocks auto-add when amount exceeds maxAutoAmount guard", async () => {
      const rule = {
        id: 1,
        name: "Petty Cash",
        version: 1,
        priority: 0,
        applyToDirection: "MONEY_OUT",
        matchMode: "ALL",
        autoAdd: true,
        maxAutoAmount: 5000, // Ceiling 5,000
        targetAccountId: 5001,
        conditionsJson: JSON.stringify([{ field: "description", operator: "CONTAINS", value: "EXPENSE" }]),
      };

      const line: BankFeedLineContext = {
        bankAccountId: 1,
        txnDate: "2025-05-15",
        descriptionRaw: "EXPENSE / BIG MACHINE",
        amount: -15000, // Exceeds 5,000 ceiling
      };

      const res = await BankRulesEngine.evaluateLine(1, line, [rule]);
      assert.equal(res.autoAdd, true);
      assert.equal(res.canAutoAdd, false);
      assert.ok(res.autoAddBlockReason?.includes("exceeds rule ceiling"));
    });

    it("allows auto-add when amount is within maxAutoAmount guard", async () => {
      const rule = {
        id: 1,
        name: "Small Tea",
        version: 1,
        priority: 0,
        applyToDirection: "MONEY_OUT",
        matchMode: "ALL",
        autoAdd: true,
        maxAutoAmount: 5000,
        targetAccountId: 5001,
        conditionsJson: JSON.stringify([{ field: "description", operator: "CONTAINS", value: "TEA" }]),
      };

      const line: BankFeedLineContext = {
        bankAccountId: 1,
        txnDate: "2025-05-15",
        descriptionRaw: "TEA SHOP UPI",
        amount: -250,
      };

      const res = await BankRulesEngine.evaluateLine(1, line, [rule]);
      assert.equal(res.canAutoAdd, true);
      assert.equal(res.autoAddBlockReason, undefined);
    });
  });
});
