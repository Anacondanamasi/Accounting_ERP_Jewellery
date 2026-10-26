// @ts-ignore
import html2pdf from "html2pdf.js";

export const downloadElementAsPdf = async (element: HTMLElement, filename: string): Promise<void> => {
  const opt = {
    margin: [4, 4, 4, 4] as [number, number, number, number],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  return html2pdf().set(opt).from(element).save();
};
