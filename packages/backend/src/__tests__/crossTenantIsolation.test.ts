import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";

const BASE_URL = "http://localhost:4000/api/v1";

describe("Cross-Tenant Data Isolation Test Suite", () => {
  let tokenCompanyA: string;
  let tokenCompanyB: string;
  let companyAUuid: string;
  let companyBUuid: string;
  let companyAInvoiceId: number;

  before(async () => {
    // 1. Authenticate user rajesh@mehtajewellers.in
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "rajesh@mehtajewellers.in",
        password: "Password@123",
      }),
    });
    const loginData = await loginRes.json();
    tokenCompanyA = loginData.data.accessToken;

    const companies = loginData.data.companies;
    const compA = companies.find((c: any) => c.name.toLowerCase().includes("mehta"));
    const compB = companies.find((c: any) => c.name.toLowerCase().includes("manav"));

    assert.ok(compA, "Company A (Mehta) exists");
    assert.ok(compB, "Company B (MANAV) exists");

    companyAUuid = compA.id;
    companyBUuid = compB.id;

    // Switch to Company B to get a token with Company B context
    const switchRes = await fetch(`${BASE_URL}/companies/${companyBUuid}/switch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenCompanyA}`,
      },
    });
    const switchData = await switchRes.json();
    tokenCompanyB = switchData.data.accessToken;

    // Find an invoice belonging to Company A
    const firstInvoice = await prisma.invoice.findFirst({
      where: { companyId: 1 },
      select: { id: true },
    });
    assert.ok(firstInvoice, "Company A has at least one invoice in DB");
    companyAInvoiceId = firstInvoice.id;
  });

  test("Read Isolation: Company B sees 0 invoices, 0 customers, 0 bills belonging to Company A", async () => {
    const endpoints = ["/invoices", "/customers", "/bills", "/bank-accounts"];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: {
          Authorization: `Bearer ${tokenCompanyB}`,
          "X-Company-ID": companyBUuid,
        },
      });

      assert.strictEqual(res.status, 200, `Expected 200 for ${ep}`);
      const body = await res.json();
      const items = Array.isArray(body.data) ? body.data : (body.data?.data ?? []);
      assert.strictEqual(
        items.length,
        0,
        `Expected 0 items for Company B on ${ep}, received ${items.length}`,
      );
    }
  });

  test("Direct ID Access (IDOR): Fetching Company A's invoice ID using Company B context fails closed", async () => {
    const res = await fetch(`${BASE_URL}/invoices/${companyAInvoiceId}`, {
      headers: {
        Authorization: `Bearer ${tokenCompanyB}`,
        "X-Company-ID": companyBUuid,
      },
    });

    // Must be 404 Not Found (or 403), never 200
    assert.ok(
      res.status === 404 || res.status === 403,
      `Expected 404/403 for cross-tenant invoice IDOR, received ${res.status}`,
    );
  });

  test("Header Spoofing / Tampering: Non-member random Company ID is blocked with 403", async () => {
    const spoofedUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${BASE_URL}/invoices`, {
      headers: {
        Authorization: `Bearer ${tokenCompanyA}`,
        "X-Company-ID": spoofedUuid,
      },
    });

    assert.strictEqual(
      res.status,
      403,
      `Expected 403 for unauthorized X-Company-ID header, received ${res.status}`,
    );
    const body = await res.json();
    assert.strictEqual(body.error.code, "ACCESS_DENIED");
  });

  test("Fail Closed: Request without company context header or valid token context is rejected", async () => {
    // Generate an unscoped dummy token or omit company header
    const res = await fetch(`${BASE_URL}/invoices`, {
      headers: {
        Authorization: "Bearer invalid_or_missing",
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected 401 Unauthorized for missing auth/tenant context, received ${res.status}`,
    );
  });

  test("Concurrent Requests: Parallel interleaved requests for Company A and B do not cross-contaminate", async () => {
    const companyAPromises = Array.from({ length: 5 }, () =>
      fetch(`${BASE_URL}/invoices`, {
        headers: {
          Authorization: `Bearer ${tokenCompanyA}`,
          "X-Company-ID": companyAUuid,
        },
      }).then((r) => r.json()),
    );

    const companyBPromises = Array.from({ length: 5 }, () =>
      fetch(`${BASE_URL}/invoices`, {
        headers: {
          Authorization: `Bearer ${tokenCompanyB}`,
          "X-Company-ID": companyBUuid,
        },
      }).then((r) => r.json()),
    );

    const [resultsA, resultsB] = await Promise.all([
      Promise.all(companyAPromises),
      Promise.all(companyBPromises),
    ]);

    for (const resA of resultsA) {
      const itemsA = resA.data?.rows ?? resA.data?.invoices ?? (Array.isArray(resA.data) ? resA.data : (resA.data?.data ?? []));
      assert.strictEqual(itemsA.length, 11, "Company A must receive all 11 invoices");
    }

    for (const resB of resultsB) {
      const itemsB = resB.data?.rows ?? resB.data?.invoices ?? (Array.isArray(resB.data) ? resB.data : (resB.data?.data ?? []));
      assert.strictEqual(itemsB.length, 0, "Company B must receive 0 invoices");
    }
  });

  test("Schema Gate: Every operational table has companyId and belongs to tenant whitelist", async () => {
    const allColumns: any = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public';
    `);

    const colsByTable = new Map<string, string[]>();
    for (const col of allColumns) {
      const list = colsByTable.get(col.table_name) ?? [];
      list.push(col.column_name.toLowerCase());
      colsByTable.set(col.table_name, list);
    }

    const GLOBAL_WHITELIST = new Set([
      "Company",
      "TenantCompany",
      "User",
      "TenantUser",
      "SubscriptionPlan",
      "RoleDefinition",
      "PermissionDefinition",
      "RolePermission",
      "ActiveSession",
      "UserCompanyMembership",
      "IdentityAuditLog",
      "HSNMaster",
      "AssetCostComponent",
      "DepreciationRunLine",
      "BankRuleVersion",
      "companies",
      "permissions",
      "role_permissions",
      "roles",
      "subscription_plans",
      "users",
      "_prisma_migrations",
    ]);

    for (const [t, colNames] of colsByTable.entries()) {
      if (GLOBAL_WHITELIST.has(t)) continue;

      const hasCompany = colNames.includes("companyid") || colNames.includes("company_id");
      assert.ok(
        hasCompany,
        `SECURITY VIOLATION: Operational table '${t}' is missing companyId/company_id column and is not in GLOBAL_WHITELIST!`,
      );
    }
  });
});
