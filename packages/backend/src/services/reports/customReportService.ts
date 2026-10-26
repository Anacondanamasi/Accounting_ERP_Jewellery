import { prisma } from "../../lib/prisma";

export interface SaveCustomReportPayload {
  reportId: string;
  name: string;
  description?: string;
  folderId?: number | null;
  visibility?: "PRIVATE" | "SHARED" | "COMPANY";
  isDefault?: boolean;
  definition: Record<string, any>;
}

export class CustomReportService {
  /**
   * List custom reports for a company.
   */
  static async listCustomReports(companyId: number, userId: string) {
    return prisma.customReport.findMany({
      where: {
        companyId,
        OR: [
          { visibility: "COMPANY" },
          { visibility: "SHARED" },
          { createdBy: userId },
        ],
      },
      include: {
        folder: true,
        schedules: { where: { isActive: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  /**
   * Create or Save As custom report.
   */
  static async saveReport(companyId: number, userId: string, payload: SaveCustomReportPayload) {
    const serializedDef = JSON.stringify(payload.definition);

    // If marked as default, unset other defaults for this reportId
    if (payload.isDefault) {
      await prisma.customReport.updateMany({
        where: { companyId, reportId: payload.reportId },
        data: { isDefault: false },
      });
    }

    return prisma.customReport.create({
      data: {
        companyId,
        reportId: payload.reportId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        folderId: payload.folderId || null,
        visibility: payload.visibility || "PRIVATE",
        isDefault: Boolean(payload.isDefault),
        definition: serializedDef,
        createdBy: userId,
      },
    });
  }

  /**
   * Update existing custom report.
   */
  static async updateReport(
    companyId: number,
    reportId: number,
    userId: string,
    payload: Partial<SaveCustomReportPayload>
  ) {
    const existing = await prisma.customReport.findFirst({
      where: { id: reportId, companyId },
    });
    if (!existing) throw new Error("Custom report not found");

    const data: any = {};
    if (payload.name) data.name = payload.name.trim();
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.folderId !== undefined) data.folderId = payload.folderId;
    if (payload.visibility) data.visibility = payload.visibility;
    if (payload.isDefault !== undefined) {
      data.isDefault = payload.isDefault;
      if (payload.isDefault) {
        await prisma.customReport.updateMany({
          where: { companyId, reportId: existing.reportId, id: { not: reportId } },
          data: { isDefault: false },
        });
      }
    }
    if (payload.definition) {
      data.definition = JSON.stringify(payload.definition);
      data.version = existing.version + 1;
    }

    return prisma.customReport.update({
      where: { id: reportId },
      data,
    });
  }

  /**
   * Delete custom report.
   */
  static async deleteReport(companyId: number, reportId: number) {
    return prisma.customReport.delete({
      where: { id: reportId },
    });
  }

  /**
   * List folders.
   */
  static async listFolders(companyId: number) {
    return prisma.reportFolder.findMany({
      where: { companyId },
      include: { _count: { select: { reports: true } } },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Create folder.
   */
  static async createFolder(companyId: number, userId: string, name: string) {
    return prisma.reportFolder.create({
      data: {
        companyId,
        name: name.trim(),
        createdBy: userId,
      },
    });
  }
}
