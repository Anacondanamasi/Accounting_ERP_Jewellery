import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { employeeService } from "@/services/employeeService";
const loansSchema = z.object({
    employeeId: z.coerce.number(),
    issuedDate: z.string().min(1),
    principal: z.coerce.number().positive(),
    monthlyRecovery: z.coerce.number().positive(),
});
const col = createColumnHelper();
const STORE_KEY = "payroll_loans_tracker_v1";
const readLoans = () => {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
};
const writeLoans = (rows) => {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(rows));
};
export const LoansAdvancesPage = () => {
    const { data: employees = [] } = useQuery({
        queryKey: ["employees-loans"],
        queryFn: () => employeeService.list(),
    });
    const [rows, setRows] = useState(() => readLoans());
    const form = useForm({
        resolver: zodResolver(loansSchema),
        defaultValues: {
            employeeId: "",
            issuedDate: formatDate(new Date(), "input"),
            principal: 0,
            monthlyRecovery: 0,
        },
    });
    const employeeMap = useMemo(() => new Map(employees.map((row) => [row.id, row])), [employees]);
    const openTotal = rows.reduce((sum, row) => sum + row.balance, 0);
    const employeeOptions = employees.map((row) => ({
        value: row.id,
        label: `${row.code} - ${row.name}`,
    }));
    const addLoan = form.handleSubmit((values) => {
        const employee = employeeMap.get(values.employeeId);
        if (!employee)
            return;
        const next = {
            id: `loan_${Date.now()}`,
            employeeId: employee.id,
            employeeName: employee.name,
            issuedDate: values.issuedDate,
            principal: values.principal,
            monthlyRecovery: values.monthlyRecovery,
            recovered: 0,
            balance: values.principal,
            status: "OPEN",
        };
        const updated = [next, ...rows];
        writeLoans(updated);
        setRows(updated);
        form.reset({
            employeeId: "",
            issuedDate: formatDate(new Date(), "input"),
            principal: 0,
            monthlyRecovery: 0,
        });
    });
    const markInstallment = (id) => {
        const updated = rows.map((row) => {
            if (row.id !== id || row.status === "CLOSED")
                return row;
            const recovered = Math.min(row.principal, row.recovered + row.monthlyRecovery);
            const balance = Math.max(0, row.principal - recovered);
            return {
                ...row,
                recovered,
                balance,
                status: balance === 0 ? "CLOSED" : "OPEN",
            };
        });
        writeLoans(updated);
        setRows(updated);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Loans & Advances", subtitle: `Outstanding ${formatCurrency(openTotal)}` }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-5", onSubmit: addLoan, children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Employee" }), _jsx(SearchableSelect, { onChange: (value) => form.setValue("employeeId", value), options: employeeOptions, value: form.watch("employeeId") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Issued Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("issuedDate") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Principal", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("principal", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Monthly Recovery", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("monthlyRecovery", { valueAsNumber: true }) })] }), _jsx("div", { className: "md:col-span-5", children: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", type: "submit", children: "Create Loan" }) })] }), _jsx(DataTable, { columns: [
                    col.accessor("employeeName", { header: "Employee" }),
                    col.accessor("issuedDate", { header: "Issued", cell: (info) => formatDate(info.getValue(), "display") }),
                    col.accessor("principal", { header: "Principal", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("monthlyRecovery", { header: "Monthly Recovery", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("recovered", { header: "Recovered", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("balance", { header: "Balance", cell: (info) => _jsx("span", { className: `font-mono ${info.getValue() > 0 ? "text-ruby" : "text-emerald"}`, children: formatCurrency(info.getValue()) }) }),
                    col.accessor("status", { header: "Status", cell: (info) => _jsx("span", { className: `rounded-full px-2 py-1 text-xs ${info.getValue() === "CLOSED" ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold"}`, children: info.getValue() }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", disabled: row.original.status === "CLOSED", onClick: () => markInstallment(row.original.id), type: "button", children: "Recover Installment" })),
                    }),
                ], data: rows })] }));
};
