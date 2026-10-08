import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService, type SettingsUser } from "@/services/settingsService";

const col = createColumnHelper<SettingsUser>();

const inviteSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "SALES", "VIEW_ONLY"]),
});

type InviteInput = z.infer<typeof inviteSchema>;

export const UsersPermissionsPage = () => {
  const form = useForm<InviteInput>({
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
    mutationFn: (payload: InviteInput) => settingsService.inviteUser(payload),
    onSuccess: () => {
      toast.success("User invited");
      form.reset();
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => toast.error(error.response?.data?.error?.message ?? "Unable to invite user"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: SettingsUser["role"] }) => settingsService.updateUserRole(id, role),
    onSuccess: () => {
      toast.success("Role updated");
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => toast.error(error.response?.data?.error?.message ?? "Unable to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => settingsService.removeUser(id),
    onSuccess: () => {
      toast.success("User removed");
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => toast.error(error.response?.data?.error?.message ?? "Unable to remove user"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Users & Permissions" subtitle="Invite users, manage roles, and control access" />

      <form className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4" onSubmit={form.handleSubmit((values) => inviteMutation.mutate(values))}>
        <label className="text-xs text-muted">Full Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("fullName")} /></label>
        <label className="text-xs text-muted">Email<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("email")} /></label>
        <label className="text-xs text-muted">Role<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("role")}><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="ACCOUNTANT">Accountant</option><option value="SALES">Sales</option><option value="VIEW_ONLY">View Only</option></select></label>
        <div className="flex items-end"><button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={inviteMutation.isPending} type="submit">{inviteMutation.isPending ? "Inviting..." : "Invite User"}</button></div>
        <div className="md:col-span-4 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
      </form>

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">Failed to load users.<button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button></div>
      ) : null}

      <DataTable
        columns={[
          col.accessor("fullName", { header: "Name" }),
          col.accessor("email", { header: "Email" }),
          col.accessor("status", {
            header: "Status",
            cell: (info) => {
              const status = info.getValue();
              const cls = status === "ACTIVE" ? "bg-emerald/10 text-emerald" : status === "INVITED" ? "bg-sapphire/10 text-sapphire" : "bg-ruby/10 text-ruby";
              return <span className={`rounded-full px-3 py-1 text-xs ${cls}`}>{status}</span>;
            },
          }),
          col.accessor("lastLoginAt", { header: "Last Login", cell: (info) => info.getValue() ? new Date(info.getValue() as string).toLocaleString("en-IN") : "-" }),
          col.display({
            id: "role",
            header: "Role",
            cell: ({ row }) => (
              <select className="h-9 rounded border border-border px-2 text-xs" defaultValue={row.original.role} onChange={(event) => roleMutation.mutate({ id: row.original.id, role: event.target.value as SettingsUser["role"] })}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="SALES">Sales</option>
                <option value="VIEW_ONLY">View Only</option>
              </select>
            ),
          }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <button className="rounded border border-ruby/30 px-2 py-1 text-xs text-ruby" disabled={row.original.status === "INACTIVE"} onClick={() => removeMutation.mutate(row.original.id)} type="button">Remove</button>
            ),
          }),
        ]}
        data={data}
        loading={isLoading}
      />
    </div>
  );
};
