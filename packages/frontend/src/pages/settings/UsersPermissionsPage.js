import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService } from "@/services/settingsService";
const col = createColumnHelper();
const inviteSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "SALES", "VIEW_ONLY"]),
});
export const UsersPermissionsPage = () => {
    const form = useForm({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            fullName: "",
            email: "",
            role: "VIEW_ONLY",
        },
    });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["settings-users"],
        queryFn: () => settingsService.getUsers(),
    });
    const inviteMutation = useMutation({
        mutationFn: (payload) => settingsService.inviteUser(payload),
        onSuccess: () => {
            toast.success("User invited");
            form.reset();
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to invite user"),
    });
    const roleMutation = useMutation({
        mutationFn: ({ id, role }) => settingsService.updateUserRole(id, role),
        onSuccess: () => {
            toast.success("Role updated");
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to update role"),
    });
    const removeMutation = useMutation({
        mutationFn: (id) => settingsService.removeUser(id),
        onSuccess: () => {
            toast.success("User removed");
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to remove user"),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Users & Permissions", subtitle: "Invite users, manage roles, and control access" }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", onSubmit: form.handleSubmit((values) => inviteMutation.mutate(values)), children: [_jsxs("label", { className: "text-xs text-muted", children: ["Full Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("fullName") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Email", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("email") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Role", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("role"), children: [_jsx("option", { value: "ADMIN", children: "Admin" }), _jsx("option", { value: "MANAGER", children: "Manager" }), _jsx("option", { value: "ACCOUNTANT", children: "Accountant" }), _jsx("option", { value: "SALES", children: "Sales" }), _jsx("option", { value: "VIEW_ONLY", children: "View Only" })] })] }), _jsx("div", { className: "flex items-end", children: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: inviteMutation.isPending, type: "submit", children: inviteMutation.isPending ? "Inviting..." : "Invite User" }) }), _jsx("div", { className: "md:col-span-4 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message })] }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load users.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("fullName", { header: "Name" }),
                    col.accessor("email", { header: "Email" }),
                    col.accessor("status", {
                        header: "Status",
                        cell: (info) => {
                            const status = info.getValue();
                            const cls = status === "ACTIVE" ? "bg-emerald/10 text-emerald" : status === "INVITED" ? "bg-sapphire/10 text-sapphire" : "bg-ruby/10 text-ruby";
                            return _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${cls}`, children: status });
                        },
                    }),
                    col.accessor("lastLoginAt", { header: "Last Login", cell: (info) => info.getValue() ? new Date(info.getValue()).toLocaleString("en-IN") : "-" }),
                    col.display({
                        id: "role",
                        header: "Role",
                        cell: ({ row }) => (_jsxs("select", { className: "h-9 rounded border border-border px-2 text-xs", defaultValue: row.original.role, onChange: (event) => roleMutation.mutate({ id: row.original.id, role: event.target.value }), children: [_jsx("option", { value: "ADMIN", children: "Admin" }), _jsx("option", { value: "MANAGER", children: "Manager" }), _jsx("option", { value: "ACCOUNTANT", children: "Accountant" }), _jsx("option", { value: "SALES", children: "Sales" }), _jsx("option", { value: "VIEW_ONLY", children: "View Only" })] })),
                    }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsx("button", { className: "rounded border border-ruby/30 px-2 py-1 text-xs text-ruby", disabled: row.original.status === "INACTIVE", onClick: () => removeMutation.mutate(row.original.id), type: "button", children: "Remove" })),
                    }),
                ], data: data, loading: isLoading })] }));
};
