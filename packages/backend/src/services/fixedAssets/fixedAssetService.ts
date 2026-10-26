import { prisma } from "../../lib/prisma";
import { calculateWdvRate } from "./booksDepreciationEngine";
import { AuditService } from "../audit/auditService";
import { ensureFixedAssetSeedData } from "./fixedAssetSeedService";

export interface CreateAssetInput {
  name: string;
  assetCode?: string;
  description?: string;
  assetCategoryId: number;
  taxBlockId?: number | null;
  serialNo?: string;
  location?: string;
  department?: string;
  custodian?: string;
  barcodeOrTag?: string;
  dateOfPurchase: Date | string;
  datePutToUse: Date | string;
  originalCost: number;
  salvageValue?: number;
  residualPercentage?: number;
  usefulLifeYears?: number;
  depreciationMethod?: "SLM" | "WDV";
  isCwip?: boolean;
  supplierBillId?: number | null;
  vendorId?: number | null;
  billInvoiceNo?: string;
  billDate?: Date | string | null;
  eligibleItcGst?: number;
  blockedItcGst?: number;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  assetCategoryId?: number;
  taxBlockId?: number | null;
  serialNo?: string;
  location?: string;
  department?: string;
  custodian?: string;
  barcodeOrTag?: string;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: "SLM" | "WDV";
  status?: string;
}

export interface ListAssetFilters {
  status?: string;
  assetCategoryId?: number;
  taxBlockId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export class FixedAssetService {
  /**
   * Generate next sequential asset code: e.g. "FA-2025-001"
   */
  public static async generateAssetCode(companyId: number, prefix = "FA"): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.fixedAsset.count({
      where: { companyId },
    });
    return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  /**
   * List assets with filtering and pagination
   */
  public static async listAssets(companyId: number, filters: ListAssetFilters) {
    await ensureFixedAssetSeedData(companyId);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(200, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.assetCategoryId) {
      where.assetCategoryId = Number(filters.assetCategoryId);
    }
    if (filters.taxBlockId) {
      where.taxBlockId = Number(filters.taxBlockId);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { assetCode: { contains: q, mode: "insensitive" } },
        { serialNo: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { custodian: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.fixedAsset.count({ where }),
      prisma.fixedAsset.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, code: true, defaultMethod: true, usefulLifeYears: true },
          },
          taxBlock: {
            select: { id: true, name: true, depreciationRate: true },
          },
        },
        orderBy: [{ datePutToUse: "desc" }, { id: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get complete details of a single asset
   */
  public static async getAssetById(companyId: number, assetId: number) {
    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, companyId },
      include: {
        category: true,
        taxBlock: true,
        costComponents: true,
        depreciationLines: {
          include: {
            depreciationRun: {
              select: { runNumber: true, runDate: true, periodStartDate: true, periodEndDate: true, journalId: true },
            },
          },
          orderBy: { id: "desc" },
          take: 50,
        },
        events: {
          orderBy: { eventDate: "desc" },
        },
        verifications: {
          orderBy: { verificationDate: "desc" },
        },
      },
    });

    if (!asset) {
      throw new Error(`Fixed asset #${assetId} not found`);
    }

    return asset;
  }

  /**
   * Create an asset in the register
   */
  public static async createAsset(companyId: number, input: CreateAssetInput, actor = "system") {
    await ensureFixedAssetSeedData(companyId, actor);

    const category = await prisma.assetCategory.findFirst({
      where: { id: input.assetCategoryId, companyId },
    });
    if (!category) {
      throw new Error(`Asset category #${input.assetCategoryId} not found`);
    }

    const usefulLifeYears = input.usefulLifeYears ?? category.usefulLifeYears;
    const depreciationMethod = input.depreciationMethod ?? (category.defaultMethod as "SLM" | "WDV");
    const residualPercentage = input.residualPercentage ?? category.residualPercentage;

    const originalCost = Math.round(Number(input.originalCost) * 100) / 100;
    const salvageValue =
      input.salvageValue !== undefined
        ? Math.round(Number(input.salvageValue) * 100) / 100
        : Math.round(((originalCost * residualPercentage) / 100) * 100) / 100;

    let wdvRate: number | null = null;
    if (depreciationMethod === "WDV") {
      wdvRate = Math.round(calculateWdvRate(originalCost, salvageValue, usefulLifeYears) * 10000) / 10000;
    }

    const assetCode =
      input.assetCode && input.assetCode.trim()
        ? input.assetCode.trim()
        : await this.generateAssetCode(companyId, category.code || "FA");

    const dateOfPurchase = new Date(input.dateOfPurchase);
    const datePutToUse = new Date(input.datePutToUse);
    const status = input.isCwip ? "CWIP" : "ACTIVE";

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.fixedAsset.create({
        data: {
          companyId,
          assetCode,
          name: input.name.trim(),
          description: input.description,
          assetCategoryId: category.id,
          taxBlockId: input.taxBlockId ?? category.taxBlockId,
          serialNo: input.serialNo,
          location: input.location,
          department: input.department,
          custodian: input.custodian,
          barcodeOrTag: input.barcodeOrTag,
          dateOfPurchase,
          datePutToUse,
          originalCost,
          salvageValue,
          usefulLifeYears,
          depreciationMethod,
          wdvRate,
          currentBookValue: originalCost,
          accumulatedDep: 0.0,
          status,
          isCwip: !!input.isCwip,
          cwipAccountId: category.cwipAccountId,
          supplierBillId: input.supplierBillId,
          vendorId: input.vendorId,
          billInvoiceNo: input.billInvoiceNo,
          billDate: input.billDate ? new Date(input.billDate) : null,
          eligibleItcGst: input.eligibleItcGst ?? 0.0,
          blockedItcGst: input.blockedItcGst ?? 0.0,
          createdBy: actor,
        },
        include: {
          category: true,
          taxBlock: true,
        },
      });

      // Add base cost component
      await tx.assetCostComponent.create({
        data: {
          fixedAssetId: created.id,
          componentName: "Base Asset Cost",
          cost: originalCost,
          eligibleGst: input.eligibleItcGst ?? 0.0,
          blockedGst: input.blockedItcGst ?? 0.0,
          capitalizedCost: originalCost,
          usefulLifeYears,
          salvageValue,
        },
      });

      // Add initial event
      await tx.assetEvent.create({
        data: {
          companyId,
          fixedAssetId: created.id,
          eventType: input.isCwip ? "CAPITALIZATION_PENDING" : "ACQUISITION",
          eventDate: datePutToUse,
          amount: originalCost,
          remarks: `Asset acquired & registered. Category: ${category.name}, Method: ${depreciationMethod}, Life: ${usefulLifeYears}y`,
          referenceType: input.supplierBillId ? "BILL" : "DIRECT_REGISTRATION",
          referenceId: input.supplierBillId ?? null,
          createdBy: actor,
        },
      });

      // Audit log entry
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_CREATE",
        entityType: "FixedAsset",
        entityId: created.id,
        entityNumber: created.assetCode,
        amountAfter: originalCost,
        summary: `Created fixed asset ${created.assetCode} - ${created.name} (₹${originalCost.toLocaleString("en-IN")})`,
        after: {
          code: created.assetCode,
          name: created.name,
          cost: originalCost,
          category: category.name,
          datePutToUse,
        },
      });

      return created;
    });

    return asset;
  }

  /**
   * Capitalize an asset from a supplier bill line
   */
  public static async capitalizeFromBill(
    companyId: number,
    billId: number,
    billData: {
      vendorId?: number;
      billInvoiceNo?: string;
      billDate?: Date | string;
    },
    assetInput: CreateAssetInput,
    actor = "system"
  ) {
    return this.createAsset(
      companyId,
      {
        ...assetInput,
        supplierBillId: billId,
        vendorId: billData.vendorId,
        billInvoiceNo: billData.billInvoiceNo,
        billDate: billData.billDate,
      },
      actor
    );
  }

  /**
   * Bulk create / import assets
   */
  public static async bulkCreateAssets(
    companyId: number,
    items: CreateAssetInput[],
    actor = "system"
  ) {
    if (!items || items.length === 0) {
      throw new Error("No asset records provided for bulk import");
    }

    const results: any[] = [];
    for (const item of items) {
      const created = await this.createAsset(companyId, item, actor);
      results.push(created);
    }
    return results;
  }

  /**
   * Update metadata or non-financial attributes of an asset
   */
  public static async updateAsset(
    companyId: number,
    assetId: number,
    input: UpdateAssetInput,
    actor = "system"
  ) {
    const existing = await this.getAssetById(companyId, assetId);

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.serialNo !== undefined) data.serialNo = input.serialNo;
    if (input.location !== undefined) data.location = input.location;
    if (input.department !== undefined) data.department = input.department;
    if (input.custodian !== undefined) data.custodian = input.custodian;
    if (input.barcodeOrTag !== undefined) data.barcodeOrTag = input.barcodeOrTag;
    if (input.assetCategoryId !== undefined) data.assetCategoryId = input.assetCategoryId;
    if (input.taxBlockId !== undefined) data.taxBlockId = input.taxBlockId;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.update({
        where: { id: assetId },
        data,
        include: { category: true, taxBlock: true },
      });

      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_UPDATE",
        entityType: "FixedAsset",
        entityId: asset.id,
        entityNumber: asset.assetCode,
        summary: `Updated fixed asset ${asset.assetCode} - ${asset.name}`,
        before: {
          location: existing.location,
          department: existing.department,
          custodian: existing.custodian,
          name: existing.name,
        },
        after: {
          location: asset.location,
          department: asset.department,
          custodian: asset.custodian,
          name: asset.name,
        },
      });

      return asset;
    });

    return updated;
  }

  /**
   * Capitalize an existing CWIP asset to ACTIVE status
   */
  public static async capitalizeCwip(
    companyId: number,
    assetId: number,
    capitalizedDate: Date | string,
    actor = "system"
  ) {
    const asset = await this.getAssetById(companyId, assetId);
    if (!asset.isCwip && asset.status !== "CWIP") {
      throw new Error(`Asset #${assetId} is not in CWIP status`);
    }

    const capDate = new Date(capitalizedDate);

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.fixedAsset.update({
        where: { id: assetId },
        data: {
          isCwip: false,
          status: "ACTIVE",
          datePutToUse: capDate,
          capitalizedAt: capDate,
        },
      });

      await tx.assetEvent.create({
        data: {
          companyId,
          fixedAssetId: assetId,
          eventType: "CAPITALIZATION",
          eventDate: capDate,
          amount: asset.originalCost,
          remarks: `Capitalized from CWIP to Active Fixed Asset on ${capDate.toISOString().slice(0, 10)}`,
          referenceType: "CWIP_TRANSFER",
          createdBy: actor,
        },
      });

      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_CAPITALIZE_CWIP",
        entityType: "FixedAsset",
        entityId: asset.id,
        entityNumber: asset.assetCode,
        summary: `Capitalized CWIP asset ${asset.assetCode} to Active status`,
      });

      return res;
    });

    return updated;
  }

  /**
   * Record physical verification of an asset
   */
  public static async recordPhysicalVerification(
    companyId: number,
    assetId: number,
    data: {
      verificationDate: Date | string;
      verifiedBy: string;
      status: string;
      locationObserved?: string;
      conditionScore?: number;
      remarks?: string;
    }
  ) {
    const asset = await this.getAssetById(companyId, assetId);

    const verification = await prisma.assetPhysicalVerification.create({
      data: {
        companyId,
        fixedAssetId: asset.id,
        verificationDate: new Date(data.verificationDate),
        verifiedBy: data.verifiedBy,
        status: data.status,
        locationObserved: data.locationObserved,
        conditionScore: data.conditionScore,
        remarks: data.remarks,
      },
    });

    return verification;
  }

  /**
   * Get KPI summary of all fixed assets
   */
  public static async getSummaryKpis(companyId: number) {
    const assets = await prisma.fixedAsset.findMany({
      where: { companyId },
      select: {
        originalCost: true,
        accumulatedDep: true,
        currentBookValue: true,
        status: true,
        isCwip: true,
      },
    });

    let totalGrossBlock = 0;
    let totalAccumulatedDep = 0;
    let totalNetBookValue = 0;
    let totalCwip = 0;
    let activeCount = 0;
    let disposedCount = 0;

    for (const a of assets) {
      if (a.isCwip || a.status === "CWIP") {
        totalCwip += a.originalCost;
      } else if (a.status !== "DISPOSED" && a.status !== "WRITTEN_OFF") {
        totalGrossBlock += a.originalCost;
        totalAccumulatedDep += a.accumulatedDep;
        totalNetBookValue += a.currentBookValue;
        activeCount++;
      } else {
        disposedCount++;
      }
    }

    return {
      totalGrossBlock: Math.round(totalGrossBlock * 100) / 100,
      totalAccumulatedDep: Math.round(totalAccumulatedDep * 100) / 100,
      totalNetBookValue: Math.round(totalNetBookValue * 100) / 100,
      totalCwip: Math.round(totalCwip * 100) / 100,
      activeCount,
      disposedCount,
      totalAssets: assets.length,
    };
  }
}
