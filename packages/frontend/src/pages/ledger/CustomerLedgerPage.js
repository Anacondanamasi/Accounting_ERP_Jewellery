import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { customerService } from "@/services/customerService";
const col = createColumnHelper();
export const CustomerLedgerPage = () => {
    const [customerId, setCustomerId] = useState(1);
    const [range, setRange] = useState({ from: "2025-04-01", to: "2025-04-30" });
    const { data: customers } = useQuery({
        queryKey: ["customers-selector"],
        queryFn: () => customerService.list({}),
    });
    const { data, isLoading } = useQuery({
        queryKey: ["customer-ledger-page", customerId, range.from, range.to],
        queryFn: () => customerService.getLedger(customerId, range),
        enabled: Boolean(customerId),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Customer Ledger", subtitle: "Running balance statement by customer" }), _jsxs("div", { className: "flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4", children: [_jsxs("div", { className: "w-full max-w-lg", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Customer" }), _jsx(SearchableSelect, { onChange: setCustomerId, options: (customers ?? []).map((customer) => ({
                                    value: customer.id,
                                    label: customer.name,
                                    meta: customer.code,
                                })), value: customerId })] }), _jsx(DateRangePicker, { onChange: setRange, value: range })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsxs("div", { className: "mb-2 text-sm text-muted", children: ["Opening Balance: ", _jsx("span", { className: "font-mono", children: formatCurrency(data?.openingBalance ?? 0) })] }), _jsx(DataTable, { columns: [
                            col.accessor("date", { header: "Date" }),
                            col.accessor("type", { header: "Type" }),
                            col.accessor("refNo", { header: "Ref No" }),
                            col.accessor("narration", { header: "Narration" }),
                            col.accessor("debit", { header: "Debit", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                            col.accessor("credit", { header: "Credit", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                            col.accessor("runningBalance", {
                                header: "Running Balance",
                                cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                            }),
                        ], data: data?.rows ?? [], loading: isLoading }), _jsxs("div", { className: "mt-2 border-t border-border pt-2 text-sm text-muted", children: ["Closing Balance: ", _jsx("span", { className: "font-mono", children: formatCurrency(data?.closingBalance ?? 0) })] })] })] }));
};
