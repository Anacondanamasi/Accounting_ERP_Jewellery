import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
const col = createColumnHelper();
export const TaxLedgerPage = () => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const { data: gstr1, isLoading: loadingGstr1 } = useQuery({
        queryKey: ["tax-ledger-gstr1", month, year],
        queryFn: () => taxService.getGstr1({ month, year }),
    });
    const { data: gstr3b, isLoading: loadingGstr3b } = useQuery({
        queryKey: ["tax-ledger-gstr3b", month, year],
        queryFn: () => taxService.getGstr3b({ month, year }),
    });
    const outwardTaxable = Number(gstr1?.totals?.taxableValue ?? 0);
    const outwardTax = Number(gstr1?.totals?.taxAmount ?? 0);
    const itc = Number(gstr3b?.itc?.net ?? 0);
    const netTax = Number(gstr3b?.netTaxPayable ?? outwardTax - itc);
    const rows = [
        {
            section: "Outward Supply (GSTR-1)",
            taxableValue: outwardTaxable,
            outputTax: outwardTax,
            inputTax: 0,
            netTax: outwardTax,
        },
        {
            section: "Input Tax Credit (GSTR-3B)",
            taxableValue: 0,
            outputTax: 0,
            inputTax: itc,
            netTax: -itc,
        },
        {
            section: "Net Payable",
            taxableValue: outwardTaxable,
            outputTax: outwardTax,
            inputTax: itc,
            netTax,
        },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Tax Ledger", subtitle: `Net Tax Payable ${formatCurrency(netTax)}` }), _jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Month", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", max: 12, min: 1, onChange: (event) => setMonth(Number(event.target.value)), type: "number", value: month })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Year", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", onChange: (event) => setYear(Number(event.target.value)), type: "number", value: year })] })] }), _jsx(DataTable, { columns: [
                    col.accessor("section", { header: "Section" }),
                    col.accessor("taxableValue", {
                        header: "Taxable Value",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("outputTax", {
                        header: "Output Tax",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("inputTax", {
                        header: "Input Tax Credit",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("netTax", {
                        header: "Net Tax",
                        cell: (info) => (_jsx("span", { className: `font-mono ${info.getValue() >= 0 ? "text-ruby" : "text-emerald"}`, children: formatCurrency(info.getValue()) })),
                    }),
                ], data: rows, loading: loadingGstr1 || loadingGstr3b })] }));
};
