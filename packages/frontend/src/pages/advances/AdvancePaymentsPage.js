import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";
const col = createColumnHelper();
export const AdvancePaymentsPage = () => {
    const [selectedBillId, setSelectedBillId] = useState("");
    const [amount, setAmount] = useState(0);
    const [mode, setMode] = useState("BANK_TRANSFER");
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["advance-payments-bills"],
        queryFn: () => billService.list({}),
    });
    const bills = (data?.rows ?? []).filter((bill) => bill.balanceDue > 0);
    const selectedBill = bills.find((bill) => bill.id === selectedBillId);
    const mutation = useMutation({
        mutationFn: () => billService.recordPayment(selectedBillId, {
            date: new Date().toISOString().slice(0, 10),
            mode,
            amount,
        }),
        onSuccess: () => {
            toast.success("Supplier payment recorded");
            setAmount(0);
            void refetch();
        },
        onError: (error) => toast.error(error?.response?.data?.error?.message ?? "Unable to record payment"),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Advance Payments", subtitle: "Record supplier-side payments and reduce payable balance" }), _jsxs("div", { className: "grid gap-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card md:grid-cols-4", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Select Bill" }), _jsx(SearchableSelect, { onChange: setSelectedBillId, options: bills.map((bill) => ({
                                    value: bill.id,
                                    label: `${bill.billNo} · ${bill.supplierName}`,
                                    meta: formatCurrency(bill.balanceDue),
                                })), value: selectedBillId })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Mode", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", value: mode, onChange: (event) => setMode(event.target.value), children: [_jsx("option", { value: "BANK_TRANSFER", children: "Bank Transfer" }), _jsx("option", { value: "UPI", children: "UPI" }), _jsx("option", { value: "CHEQUE", children: "Cheque" }), _jsx("option", { value: "CASH", children: "Cash" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Amount", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", step: "0.01", type: "number", value: amount, onChange: (event) => setAmount(Number(event.target.value)) })] }), _jsxs("div", { className: "md:col-span-4", children: [_jsxs("div", { className: "text-sm text-muted", children: ["Selected Bill Balance:", " ", _jsx("span", { className: "font-mono", children: formatCurrency(selectedBill?.balanceDue ?? 0) })] }), _jsx("button", { className: "mt-2 h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => mutation.mutate(), type: "button", children: "Record Payment" })] })] }), _jsx(DataTable, { columns: [
                    col.accessor("billNo", { header: "Bill No" }),
                    col.accessor("supplierName", { header: "Supplier" }),
                    col.accessor("billDate", { header: "Bill Date" }),
                    col.accessor("dueDate", { header: "Due Date" }),
                    col.accessor("grandTotal", { header: "Grand Total", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("paidAmount", { header: "Paid", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("balanceDue", { header: "Balance Due", cell: (info) => _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("status", { header: "Status" }),
                ], data: data?.rows ?? [], loading: isLoading })] }));
};
