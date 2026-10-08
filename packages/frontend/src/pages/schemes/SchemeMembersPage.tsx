import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, CreditCard, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { schemeService } from "@/services/schemeService";
import { customerService } from "@/services/customerService";

const enrollSchema = z.object({
  schemeId: z.coerce.number(),
  customerId: z.coerce.number(),
  enrollDate: z.string().min(1, "Enroll date is required"),
  monthlyAmt: z.coerce.number().positive(),
  totalInstallments: z.coerce.number().int().positive(),
});

type EnrollInput = z.infer<typeof enrollSchema>;
const col = createColumnHelper<any>();

export const SchemeMembersPage = () => {
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  
  const form = useForm<EnrollInput>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      enrollDate: new Date().toISOString().slice(0, 10),
      totalInstallments: 11,
    },
  });

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ["scheme-members"],
    queryFn: () => schemeService.listMembers(),
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["schemes-list"],
    queryFn: () => schemeService.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customerService.list({}),
  });

  const enrollMutation = useMutation({
    mutationFn: (payload: EnrollInput) => schemeService.enrollMember(payload),
    onSuccess: () => {
      toast.success("Member enrolled successfully");
      setIsEnrollModalOpen(false);
      form.reset();
      void refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Failed to enroll member"),
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => schemeService.payInstallment(id),
    onSuccess: () => {
      toast.success("Installment paid");
      void refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Failed to pay installment"),
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Scheme Members"
        subtitle="Manage active gold scheme enrollments and collections"
        actions={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all"
            onClick={() => setIsEnrollModalOpen(true)}
            type="button"
          >
            <UserPlus className="h-4 w-4" /> Enroll New Member
          </button>
        }
      />

      <div className="rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden">
        <DataTable
          columns={[
            col.accessor("customer.name", {
              header: "Member Name",
              cell: (info) => <div className="flex flex-col"><span className="font-bold text-charcoal">{info.getValue()}</span><span className="text-[10px] text-muted">{info.row.original.customer?.mobile}</span></div>,
            }),
            col.accessor("scheme.name", {
              header: "Scheme",
              cell: (info) => <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold uppercase">{info.getValue()}</span>,
            }),
            col.accessor("monthlyAmt", {
              header: "Monthly Amt",
              cell: (info) => <span className="font-mono font-semibold">{formatCurrency(info.getValue())}</span>,
            }),
            col.accessor("paidInstallments", {
              header: "Progress",
              cell: (info) => {
                const paid = info.getValue();
                const total = info.row.original.totalInstallments;
                const pct = (paid / total) * 100;
                return (
                  <div className="w-full max-w-[100px]">
                    <div className="flex justify-between text-[10px] mb-1 font-bold"><span>{paid}/{total}</span><span>{Math.round(pct)}%</span></div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              },
            }),
            col.accessor("totalDeposited", {
              header: "Total Saved",
              cell: (info) => <span className="font-mono font-bold text-emerald">{formatCurrency(info.getValue())}</span>,
            }),
            col.accessor("status", {
              header: "Status",
              cell: (info) => {
                const status = info.getValue();
                const cls = status === "ACTIVE" ? "bg-emerald/10 text-emerald" : status === "MATURED" ? "bg-gold/10 text-gold" : "bg-ruby/10 text-ruby";
                return <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${cls}`}>{status}</span>;
              },
            }),
            col.display({
              id: "actions",
              cell: (info) => (
                <button
                  className="inline-flex h-8 items-center gap-2 rounded border border-gold/30 bg-gold/5 px-3 text-xs font-bold text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                  disabled={info.row.original.status !== "ACTIVE" || payMutation.isPending}
                  onClick={() => payMutation.mutate(info.row.original.id)}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Pay
                </button>
              ),
            }),
          ]}
          data={members}
          isLoading={isLoading}
        />
      </div>

      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card bg-card p-6 shadow-card border-t-4 border-t-gold">
            <h2 className="mb-4 font-display text-xl font-bold">Enroll New Member</h2>
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => enrollMutation.mutate(v))}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">Customer</label>
                <SearchableSelect
                  onChange={(val) => form.setValue("customerId", val, { shouldValidate: true })}
                  options={customers.map((c: any) => ({ value: c.id, label: c.name, meta: c.mobile }))}
                  value={form.watch("customerId")}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">Scheme</label>
                <select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" {...form.register("schemeId")}>
                  <option value="">Select Scheme</option>
                  {schemes.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.monthlyMin)} - {formatCurrency(s.monthlyMax)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">Monthly Amt</label>
                  <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" type="number" {...form.register("monthlyAmt")} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">Duration (Mos)</label>
                  <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" type="number" {...form.register("totalInstallments")} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">Enroll Date</label>
                <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" type="date" {...form.register("enrollDate")} />
              </div>

              <div className="flex gap-3 pt-4">
                <button className="h-10 flex-1 rounded-btn border border-border text-sm font-medium hover:bg-slate-50 transition-colors" onClick={() => setIsEnrollModalOpen(false)} type="button">
                  Cancel
                </button>
                <button className="h-10 flex-1 rounded-btn bg-gold text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50" disabled={enrollMutation.isPending}>
                  {enrollMutation.isPending ? "Enrolling..." : "Enroll Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
