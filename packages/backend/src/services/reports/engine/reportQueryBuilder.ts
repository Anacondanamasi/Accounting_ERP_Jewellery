import { Prisma } from "@prisma/client";
import {
  JOURNAL_FIELD_CATALOG,
  isFieldAllowed,
  isOperatorAllowed,
  type FilterOperator,
} from "./reportFieldCatalog";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
}

export interface FilterGroup {
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  groups?: FilterGroup[];
  isNegated?: boolean;
}

export interface QueryPlanOptions {
  companyId: number;
  from?: string;
  to?: string;
  dateField?: "date" | "postedAt" | "createdAt" | "updatedAt";
  filterMode?: "match_transactions" | "match_lines_only";
  filters?: FilterGroup;
  limit?: number;
  cursor?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  status?: string;
}

export class ReportQueryBuilder {
  /**
   * Validates filter group complexity to defend against deep nesting / DoS.
   */
  static validateFilterTree(group?: FilterGroup, depth = 1): void {
    if (!group) return;
    if (depth > 4) {
      throw new Error("Filter nesting exceeds maximum allowed depth of 4");
    }

    if (group.conditions) {
      for (const cond of group.conditions) {
        if (!isFieldAllowed(cond.field)) {
          throw new Error(`Unauthorized filter field: '${cond.field}'`);
        }
        if (!isOperatorAllowed(cond.field, cond.operator)) {
          throw new Error(
            `Operator '${cond.operator}' is not permitted for field '${cond.field}'`
          );
        }
        // Validate array limits
        if (Array.isArray(cond.value) && cond.value.length > 200) {
          throw new Error(`Filter list for field '${cond.field}' exceeds 200 items limit`);
        }
      }
    }

    if (group.groups) {
      for (const subGroup of group.groups) {
        this.validateFilterTree(subGroup, depth + 1);
      }
    }
  }

  /**
   * Resolves a single field condition into Prisma where clause.
   */
  static buildConditionWhere(cond: FilterCondition): {
    entryWhere?: Prisma.JournalEntryWhereInput;
    lineWhere?: Prisma.JournalLineWhereInput;
    accountWhere?: Prisma.AccountWhereInput;
  } {
    const { field, operator, value } = cond;
    const cat = JOURNAL_FIELD_CATALOG[field]?.category;

    // Date / Entry level fields
    if (field === "date" || field === "postedAt" || field === "createdAt" || field === "updatedAt") {
      let filterObj: any = {};
      if (operator === "equals") filterObj = new Date(value);
      else if (operator === "gt") filterObj = { gt: new Date(value) };
      else if (operator === "gte") filterObj = { gte: new Date(value) };
      else if (operator === "lt") filterObj = { lt: new Date(value) };
      else if (operator === "lte") filterObj = { lte: new Date(value) };
      else if (operator === "between" && Array.isArray(value) && value.length === 2) {
        filterObj = { gte: new Date(value[0]), lte: new Date(value[1]) };
      } else if (operator === "is_null") filterObj = null;
      else if (operator === "is_not_null") filterObj = { not: null };

      return { entryWhere: { [field]: filterObj } };
    }

    if (field === "entryNo") {
      if (operator === "equals") return { entryWhere: { entryNo: String(value) } };
      if (operator === "contains")
        return { entryWhere: { entryNo: { contains: String(value), mode: "insensitive" } } };
      if (operator === "starts_with")
        return { entryWhere: { entryNo: { startsWith: String(value), mode: "insensitive" } } };
      if (operator === "in" && Array.isArray(value))
        return { entryWhere: { entryNo: { in: value.map(String) } } };
    }

    if (field === "voucherType") {
      const typeStr = String(value).toUpperCase();
      if (operator === "equals") {
        return { entryWhere: { type: { startsWith: `${typeStr}:` } } };
      }
      if (operator === "in" && Array.isArray(value)) {
        return {
          entryWhere: {
            OR: value.map((t) => ({ type: { startsWith: `${String(t).toUpperCase()}:` } })),
          },
        };
      }
    }

    if (field === "status") {
      if (operator === "equals") return { entryWhere: { status: String(value).toUpperCase() } };
      if (operator === "in" && Array.isArray(value)) {
        return { entryWhere: { status: { in: value.map((v) => String(v).toUpperCase()) } } };
      }
    }

    if (field === "narration") {
      if (operator === "contains") {
        return {
          entryWhere: { narration: { contains: String(value), mode: "insensitive" } },
        };
      }
      if (operator === "equals") {
        return { entryWhere: { narration: String(value) } };
      }
    }

    if (field === "createdBy") {
      if (operator === "equals") return { entryWhere: { createdBy: String(value) } };
      if (operator === "in" && Array.isArray(value)) {
        return { entryWhere: { createdBy: { in: value.map(String) } } };
      }
    }

    if (field === "isManual") {
      if (operator === "is_true") {
        return { entryWhere: { OR: [{ type: null }, { type: "MANUAL" }] } };
      }
      if (operator === "is_false") {
        return { entryWhere: { AND: [{ type: { not: null } }, { type: { not: "MANUAL" } }] } };
      }
    }

    // Line level fields
    if (field === "debit" || field === "credit") {
      let amountObj: any = {};
      const numVal = Number(value);
      if (operator === "equals") amountObj = numVal;
      else if (operator === "gt") amountObj = { gt: numVal };
      else if (operator === "gte") amountObj = { gte: numVal };
      else if (operator === "lt") amountObj = { lt: numVal };
      else if (operator === "lte") amountObj = { lte: numVal };
      else if (operator === "between" && Array.isArray(value) && value.length === 2) {
        amountObj = { gte: Number(value[0]), lte: Number(value[1]) };
      }
      return { lineWhere: { [field]: amountObj } };
    }

    if (field === "isReconciled") {
      if (operator === "is_true") return { lineWhere: { reconciliationId: { not: null } } };
      if (operator === "is_false") return { lineWhere: { reconciliationId: null } };
    }

    // Account level fields
    if (field === "accountCode") {
      if (operator === "equals") return { accountWhere: { code: String(value) } };
      if (operator === "starts_with")
        return { accountWhere: { code: { startsWith: String(value) } } };
      if (operator === "in" && Array.isArray(value))
        return { accountWhere: { code: { in: value.map(String) } } };
    }

    if (field === "accountName") {
      if (operator === "contains")
        return { accountWhere: { name: { contains: String(value), mode: "insensitive" } } };
      if (operator === "equals") return { accountWhere: { name: String(value) } };
      if (operator === "in" && Array.isArray(value))
        return { accountWhere: { name: { in: value.map(String) } } };
    }

    if (field === "accountType") {
      if (operator === "equals") return { accountWhere: { type: String(value) } };
      if (operator === "in" && Array.isArray(value))
        return { accountWhere: { type: { in: value.map(String) } } };
    }

    if (field === "isControlAccount") {
      if (operator === "is_true") return { accountWhere: { isControlAccount: true } };
      if (operator === "is_false") return { accountWhere: { isControlAccount: false } };
    }

    // Fallback: search narration on line
    if (field === "partyName") {
      return {
        entryWhere: { narration: { contains: String(value), mode: "insensitive" } },
      };
    }

    return {};
  }
}
