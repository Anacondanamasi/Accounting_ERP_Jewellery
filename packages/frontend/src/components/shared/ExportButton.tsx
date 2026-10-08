import { Download } from "lucide-react";
import { useState } from "react";

interface ExportButtonProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
}

export const ExportButton = ({ onExportPDF, onExportExcel, onExportCSV }: ExportButtonProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded border border-border bg-white py-1 shadow-card">
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint" onClick={onExportPDF} type="button">
            Export PDF
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint"
            onClick={onExportExcel}
            type="button"
          >
            Export Excel
          </button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint" onClick={onExportCSV} type="button">
            Export CSV
          </button>
        </div>
      ) : null}
    </div>
  );
};
