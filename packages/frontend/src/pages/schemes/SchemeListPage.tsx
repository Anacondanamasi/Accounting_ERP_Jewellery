import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { schemeService } from "@/services/schemeService";

interface SchemeRow {
  id: number;
  name: string;
  monthlyMin: number | string;
  monthlyMax: number | string;
  durationMonths: number;
  bonusType: string;
  bonusValue: number | string;
  isActive: boolean;
  members?: Array<unknown>;
}

const schemeSchema = z.object({
  name: z.string().min(1),
  monthlyMin: z.coerce.number().nonnegative(),
  monthlyMax: z.coerce.number().nonnegative(),
  durationMonths: z.coerce.number().int().positive(),
  bonusType: z.string().min(1),
  bonusValue: z.coerce.number().nonnegative(),
  isActive: z.boolean(),
});

type SchemeInput = z.infer<typeof schemeSchema>;
const col = createColumnHelper<SchemeRow>();
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const SchemeListPage = () => {
  const [editing, setEditing] = useState<SchemeRow | null>(null);
  const form = useForm<SchemeInput>({
    resolver: zodResolver(schemeSchema),
    defaultValues: {
      name: "",
      monthlyMin: 500,
      monthlyMax: 50000,
      durationMonths: 11,
      bonusType: "INSTALLMENT",
      bonusValue: 1,
      isActive: true,
    },
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["gold-schemes"],
    queryFn: () => schemeService.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: SchemeInput) =>
      editing ? schemeService.update(editing.id, payload) : schemeService.create(payload),
    onSuccess: () => {
      toast.success(editing ? "Scheme updated" : "Scheme created");
      setEditing(null);
      form.reset({
        name: "",
        monthlyMin: 500,
        monthlyMax: 50000,
        durationMonths: 11,
        bonusType: "INSTALLMENT",
        bonusValue: 1,
        isActive: true,
      });
      void refetch();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error?.message ?? "Unable to save scheme"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Gold Schemes" subtitle={`${(data as SchemeRow[]).length} schemes configured`} />

      <form className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
        <label className="text-xs text-muted">Scheme Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("name")} /></label>
        <label className="text-xs text-muted">Monthly Min<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("monthlyMin", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Monthly Max<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("monthlyMax", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Duration (Months)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("durationMonths", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Bonus Type<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("bonusType")}><option value="INSTALLMENT">INSTALLMENT</option><option value="PERCENTAGE">PERCENTAGE</option><option value="FLAT">FLAT</option></select></label>
        <label className="text-xs text-muted">Bonus Value<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("bonusValue", { valueAsNumber: true })} /></label>
        <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" {...form.register("isActive")} />Active</label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? "Saving..." : editing ? "Update Scheme" : "Create Scheme"}
          </button>
          {editing ? (
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm"
              onClick={() => {
                setEditing(null);
                form.reset({
                  name: "",
                  monthlyMin: 500,
                  monthlyMax: 50000,
                  durationMonths: 11,
                  bonusType: "INSTALLMENT",
                  bonusValue: 1,
                  isActive: true,
                });
              }}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        columns={[
          col.accessor("name", { header: "Scheme" }),
          col.accessor("monthlyMin", { header: "Monthly Min", cell: (info) => <span className="font-mono">{formatCurrency(toNumber(info.getValue()))}</span> }),
          col.accessor("monthlyMax", { header: "Monthly Max", cell: (info) => <span className="font-mono">{formatCurrency(toNumber(info.getValue()))}</span> }),
          col.accessor("durationMonths", { header: "Duration" }),
          col.accessor("bonusType", { header: "Bonus Type" }),
          col.accessor("bonusValue", { header: "Bonus", cell: (info) => <span className="font-mono">{toNumber(info.getValue())}</span> }),
          col.accessor((row) => row.members?.length ?? 0, { id: "members", header: "Members" }),
          col.accessor("isActive", { header: "Status", cell: (info) => <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`}>{info.getValue() ? "ACTIVE" : "INACTIVE"}</span> }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <button
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={() => {
                  setEditing(row.original);
                  form.reset({
                    name: row.original.name,
                    monthlyMin: toNumber(row.original.monthlyMin),
                    monthlyMax: toNumber(row.original.monthlyMax),
                    durationMonths: row.original.durationMonths,
                    bonusType: row.original.bonusType,
                    bonusValue: toNumber(row.original.bonusValue),
                    isActive: row.original.isActive,
                  });
                }}
                type="button"
              >
                Edit
              </button>
            ),
          }),
        ]}
        data={data as SchemeRow[]}
        loading={isLoading}
      />
    </div>
  );
};
