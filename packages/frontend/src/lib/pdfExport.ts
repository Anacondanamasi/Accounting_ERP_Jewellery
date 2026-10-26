// @ts-ignore
import html2pdf from "html2pdf.js";

export const downloadElementAsPdf = async (element: HTMLElement, filename: string): Promise<void> => {
  const opt = {
    margin: [4, 4, 4, 4],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  return html2pdf().set(opt).from(element).save();
};
