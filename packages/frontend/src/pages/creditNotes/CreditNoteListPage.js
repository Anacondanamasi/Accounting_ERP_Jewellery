import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { noteService } from "@/services/noteService";
import { formatCurrency, formatDate } from "@/lib/formatters";
const columnHelper = createColumnHelper();
export const CreditNoteListPage = () => {
    const navigate = useNavigate();
    const { data = [], isLoading } = useQuery({
        queryKey: ["credit-notes"],
        queryFn: () => noteService.credit.list(),
    });
    return (_jsxs("div", { className: "space-y-4 animate-in fade-in duration-500", children: [_jsx(PageHeader, { title: "Credit Notes", subtitle: "Manage sales returns and customer credits", actions: _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all", onClick: () => navigate("/credit-notes/new"), type: "button", children: [_jsx(Plus, { className: "h-4 w-4" }), " Create Credit Note"] }) }), _jsxs("div", { className: "flex items-center gap-2 rounded-card border border-border bg-card p-2 shadow-sm", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" }), _jsx("input", { className: "h-9 w-full rounded border-none bg-transparent pl-10 text-sm focus:ring-0", placeholder: "Search by Note No, Party name..." })] }), _jsxs("button", { className: "flex h-9 items-center gap-2 rounded border border-border px-3 text-sm font-medium hover:bg-slate-50 transition-colors", children: [_jsx(Filter, { className: "h-4 w-4 text-muted" }), " Filters"] })] }), _jsx("div", { className: "rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden", children: _jsx(DataTable, { columns: [
                        columnHelper.accessor("noteNo", {
                            header: "Note No",
                            cell: (info) => _jsx("span", { className: "font-mono font-bold text-charcoal", children: info.getValue() }),
                        }),
                        columnHelper.accessor("date", {
                            header: "Date",
                            cell: (info) => _jsx("span", { className: "text-slate-600", children: formatDate(info.getValue()) }),
                        }),
                        columnHelper.accessor((row) => row.customer?.name || "Walking Customer", {
                            header: "Customer",
                            cell: (info) => _jsx("span", { className: "font-medium text-slate-700", children: info.getValue() }),
                        }),
                        columnHelper.accessor("referenceNo", {
                            header: "Ref Invoice",
                            cell: (info) => _jsx("span", { className: "text-xs text-muted", children: info.getValue() || "-" }),
                        }),
                        columnHelper.accessor("grandTotal", {
                            header: "Total Amount",
                            cell: (info) => _jsx("span", { className: "font-mono font-bold text-charcoal", children: formatCurrency(info.getValue()) }),
                        }),
                        columnHelper.accessor("status", {
                            header: "Status",
                            cell: (info) => _jsx(StatusBadge, { status: info.getValue() || "POSTED" }),
                        }),
                        columnHelper.display({
                            id: "actions",
                            cell: (info) => (_jsx("button", { className: "text-xs font-semibold text-gold hover:text-gold-dark transition-colors", onClick: () => navigate(`/credit-notes/${info.row.original.id}`), children: "View Details" })),
                        }),
                    ], data: data, isLoading: isLoading }) })] }));
};
