import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  JOURNAL_FIELD_CATALOG,
  isFieldAllowed,
  isOperatorAllowed,
} from "../reportFieldCatalog";
import { ReportQueryBuilder, type FilterGroup } from "../reportQueryBuilder";
import { JournalReportEngineService } from "../journalReportEngineService";

describe("Generic Report Engine & Field Catalog", () => {
  it("whitelists valid journal fields and rejects arbitrary fields", () => {
    assert.equal(isFieldAllowed("date"), true);
    assert.equal(isFieldAllowed("debit"), true);
    assert.equal(isFieldAllowed("credit"), true);
    assert.equal(isFieldAllowed("accountCode"), true);
    assert.equal(isFieldAllowed("voucherType"), true);
    assert.equal(isFieldAllowed("isManual"), true);

    // SQL Injection / Unwhitelisted fields
    assert.equal(isFieldAllowed("password_hash"), false);
    assert.equal(isFieldAllowed("1 OR 1=1"), false);
    assert.equal(isFieldAllowed("DROP TABLE"), false);
    assert.equal(isFieldAllowed("nonExistentField"), false);
  });

  it("permits only appropriate operators for data types", () => {
    // Numeric / Currency
    assert.equal(isOperatorAllowed("debit", "gte"), true);
    assert.equal(isOperatorAllowed("debit", "between"), true);
    assert.equal(isOperatorAllowed("debit", "contains"), false);

    // String
    assert.equal(isOperatorAllowed("narration", "contains"), true);
    assert.equal(isOperatorAllowed("narration", "gt"), false);

    // Boolean
    assert.equal(isOperatorAllowed("isManual", "is_true"), true);
    assert.equal(isOperatorAllowed("isManual", "is_false"), true);
    assert.equal(isOperatorAllowed("isManual", "contains"), false);
  });

  it("safely rejects malicious deep nesting (> 4 levels)", () => {
    const maliciousDeepFilter: FilterGroup = {
      logic: "AND",
      conditions: [{ field: "date", operator: "equals", value: "2026-04-01" }],
      groups: [
        {
          logic: "OR",
          conditions: [{ field: "debit", operator: "gt", value: 1000 }],
          groups: [
            {
              logic: "AND",
              conditions: [{ field: "credit", operator: "gt", value: 500 }],
              groups: [
                {
                  logic: "OR",
                  conditions: [{ field: "voucherType", operator: "equals", value: "INVOICE" }],
                  groups: [
                    {
                      logic: "AND",
                      conditions: [{ field: "status", operator: "equals", value: "POSTED" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    assert.throws(
      () => ReportQueryBuilder.validateFilterTree(maliciousDeepFilter),
      /Filter nesting exceeds maximum allowed depth/
    );
  });

  it("safely rejects oversized array filter payloads (> 200 items)", () => {
    const hugeList = Array.from({ length: 250 }, (_, i) => `ACC-${i}`);
    const filterWithHugeList: FilterGroup = {
      logic: "AND",
      conditions: [{ field: "accountCode", operator: "in", value: hugeList }],
    };

    assert.throws(
      () => ReportQueryBuilder.validateFilterTree(filterWithHugeList),
      /exceeds 200 items limit/
    );
  });

  it("rejects unauthorized field names inside filter AST", () => {
    const filterWithHackedField: FilterGroup = {
      logic: "AND",
      conditions: [{ field: "hacked_column_name", operator: "equals", value: "val" }],
    };

    assert.throws(
      () => ReportQueryBuilder.validateFilterTree(filterWithHackedField),
      /Unauthorized filter field/
    );
  });
});

describe("Journal Report Engine: Date & Period Resolution", () => {
  it("resolves Indian Financial Year (April 1 to March 31)", () => {
    const resolved = JournalReportEngineService.resolvePeriodDates("this_fy");
    assert.match(resolved.from, /^\d{4}-04-01$/);
    assert.match(resolved.to, /^\d{4}-03-31$/);
    assert.match(resolved.label, /This FY/);
  });

  it("resolves Last Financial Year", () => {
    const resolved = JournalReportEngineService.resolvePeriodDates("last_fy");
    assert.match(resolved.from, /^\d{4}-04-01$/);
    assert.match(resolved.to, /^\d{4}-03-31$/);
    assert.match(resolved.label, /Last FY/);
  });

  it("resolves custom date ranges", () => {
    const resolved = JournalReportEngineService.resolvePeriodDates("custom", "2026-05-01", "2026-05-15");
    assert.equal(resolved.from, "2026-05-01");
    assert.equal(resolved.to, "2026-05-15");
    assert.equal(resolved.label, "2026-05-01 to 2026-05-15");
  });
});
