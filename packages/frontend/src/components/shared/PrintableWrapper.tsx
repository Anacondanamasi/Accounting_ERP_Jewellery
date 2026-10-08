import type { PropsWithChildren } from "react";

export const PrintableWrapper = ({ children }: PropsWithChildren) => (
  <div>
    <style>
      {`@media print { .no-print { display:none !important; } body { background: #fff; } }`}
    </style>
    <div className="no-print mb-4">
      <button
        className="h-10 rounded-btn border border-border px-4 text-sm"
        onClick={() => window.print()}
        type="button"
      >
        Print
      </button>
    </div>
    {children}
  </div>
);
