import { api } from "@/lib/axios";

export const useExport = () => {
  const exportReport = async (reportType: string, params: unknown, format: "pdf" | "excel" | "csv") => {
    const response = await api.post(
      "/reports/export",
      { reportType, params, format },
      { responseType: "blob" },
    );

    // Extract filename from server Content-Disposition header if available
    const ext = format === "excel" ? "xlsx" : format;
    let filename = `${reportType}.${ext}`;

    const disposition = response.headers?.["content-disposition"] || response.headers?.["Content-Disposition"];
    if (disposition && typeof disposition === "string") {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match?.[1]) {
        filename = match[1].trim();
      }
    } else if (params && typeof params === "object") {
      const p = params as Record<string, string>;
      if (p.from && p.to) {
        filename = `${reportType}_${p.from}_to_${p.to}.${ext}`;
      } else if (p.to || p.date) {
        filename = `${reportType}_${p.to || p.date}.${ext}`;
      }
    }

    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return { exportReport };
};
