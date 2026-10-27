import { api } from "@/lib/axios";

export interface LabelTemplateOption {
  code: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  isDefault: boolean;
}

export interface LabelPrintPayload {
  templateCode: string;
  items: Array<{
    itemId: number;
    copies: number;
  }>;
  offsetXmm?: number;
  offsetYmm?: number;
  showPrice?: boolean;
  showWeight?: boolean;
  showKarat?: boolean;
  showHuid?: boolean;
}

export const labelService = {
  async getTemplates(): Promise<LabelTemplateOption[]> {
    const res = await api.get<{ templates: LabelTemplateOption[] }>("/labels/templates");
    return res.data.templates;
  },

  async downloadLabelsPdf(payload: LabelPrintPayload): Promise<void> {
    const res = await api.post("/labels/print", payload, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `labels_${payload.templateCode.toLowerCase()}_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 2000);
  },

  async getLabelsPdfBlob(payload: LabelPrintPayload): Promise<Blob> {
    const res = await api.post("/labels/print", payload, {
      responseType: "blob",
    });
    return new Blob([res.data], { type: "application/pdf" });
  },
};
