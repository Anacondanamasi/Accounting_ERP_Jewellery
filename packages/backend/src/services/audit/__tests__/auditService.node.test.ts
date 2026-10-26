import test from "node:test";
import assert from "node:assert/strict";
import {
  computeFieldDiffs,
  maskSensitiveValue,
  computeCanonicalHash,
  GENESIS_HASH,
} from "../auditService";

test("AuditService: Sensitive Data Masking (DPDP & Banking Standard)", () => {
  // Password masking
  assert.equal(maskSensitiveValue("password", "Secret123"), "[MASKED]");
  assert.equal(maskSensitiveValue("apiSecret", "xyz-token"), "[MASKED]");

  // PAN masking (masks characters 6-9)
  assert.equal(maskSensitiveValue("pan", "ABCDE1234F"), "ABCDE****F");

  // Bank account masking (leaves last 4 digits)
  assert.equal(maskSensitiveValue("bankAccount", "50100239481928"), "••••1928");
  assert.equal(maskSensitiveValue("accountNo", "9910293810"), "••••3810");

  // Non-sensitive values untouched
  assert.equal(maskSensitiveValue("customerName", "Priya Ornaments"), "Priya Ornaments");
  assert.equal(maskSensitiveValue("amount", 25000), 25000);
});

test("AuditService: Field-Level Diff Generation", () => {
  const before = {
    invoiceNo: "INV-001",
    grandTotal: 10000,
    placeOfSupply: "Gujarat",
    status: "OPEN",
    passwordHash: "old-hash",
    bankAccount: "50100481920192",
  };

  const after = {
    invoiceNo: "INV-001",
    grandTotal: 11800,
    placeOfSupply: "Maharashtra",
    status: "PAID",
    passwordHash: "new-hash",
    bankAccount: "50100481920192", // unchanged
  };

  const diffs = computeFieldDiffs(before, after);

  assert.equal(diffs.length, 4);

  const totalDiff = diffs.find((d) => d.field === "grandTotal");
  assert.ok(totalDiff);
  assert.equal(totalDiff?.label, "Total Amount");
  assert.equal(totalDiff?.old, 10000);
  assert.equal(totalDiff?.new, 11800);

  const posDiff = diffs.find((d) => d.field === "placeOfSupply");
  assert.ok(posDiff);
  assert.equal(posDiff?.label, "Place of Supply");
  assert.equal(posDiff?.old, "Gujarat");
  assert.equal(posDiff?.new, "Maharashtra");

  const pwdDiff = diffs.find((d) => d.field === "passwordHash");
  assert.ok(pwdDiff);
  assert.equal(pwdDiff?.old, "[MASKED]");
  assert.equal(pwdDiff?.new, "[MASKED]");
});

test("AuditService: Canonical SHA-256 Hash Chaining & Tamper Detection", () => {
  const date1 = "2025-04-01T10:00:00.000Z";
  const date2 = "2025-04-01T11:00:00.000Z";

  // Event 1 linked to GENESIS
  const hash1 = computeCanonicalHash({
    occurredAt: date1,
    companyId: 1,
    actorId: "user-1",
    eventType: "invoice.created",
    entityType: "Invoice",
    entityId: "101",
    amountAfter: 50000,
    changesJson: null,
    prevHash: GENESIS_HASH,
  });

  assert.equal(typeof hash1, "string");
  assert.equal(hash1.length, 64);

  // Event 2 chained to Event 1's hash
  const hash2 = computeCanonicalHash({
    occurredAt: date2,
    companyId: 1,
    actorId: "user-2",
    eventType: "invoice.updated",
    entityType: "Invoice",
    entityId: "101",
    amountAfter: 55000,
    changesJson: JSON.stringify([{ field: "grandTotal", old: 50000, new: 55000 }]),
    prevHash: hash1,
  });

  assert.equal(typeof hash2, "string");
  assert.notEqual(hash1, hash2);

  // Tamper test: if Event 1's amount was altered after the fact, its hash changes
  const tamperedHash1 = computeCanonicalHash({
    occurredAt: date1,
    companyId: 1,
    actorId: "user-1",
    eventType: "invoice.created",
    entityType: "Invoice",
    entityId: "101",
    amountAfter: 999999, // tampered amount
    changesJson: null,
    prevHash: GENESIS_HASH,
  });

  assert.notEqual(hash1, tamperedHash1, "Tampered record produces different hash");

  // Consequently, Event 2's prevHash will not match Event 1's recomputed hash
  assert.equal(hash2 === tamperedHash1, false);
});
