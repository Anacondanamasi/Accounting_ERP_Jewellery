import { api } from "@/lib/axios";
export const useExport = () => {
    const exportReport = async (reportType, params, format) => {
        const response = await api.post("/reports/export", { reportType, params, format }, { responseType: "blob" });
        const blob = new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${reportType}.${format === "excel" ? "xlsx" : format}`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    return { exportReport };
};
