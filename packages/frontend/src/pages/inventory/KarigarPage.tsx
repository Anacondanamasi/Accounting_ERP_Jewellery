import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService, type KarigarRow } from "@/services/inventoryService";

const col = createColumnHelper<KarigarRow>();

const karigarSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  specialization: z.string().min(2),
  mobile: z.string().min(8),
  goldInHand: z.coerce.number().nonnegative(),
  pendingReturn: z.coerce.number().int().nonnegative(),
  makingDue: z.coerce.number().nonnegative(),
  isActive: z.boolean(),
});

type KarigarInput = z.infer<typeof karigarSchema>;

export const KarigarPage = () => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<KarigarRow | null>(null);

  const form = useForm<KarigarInput>({
    resolver: zodResolver(karigarSchema),
    defaultValues: {
      code: "",
      name: "",
      specialization: "",
      mobile: "",
      goldInHand: 0,
      pendingReturn: 0,
      makingDue: 0,
      isActive: true,
    },
  });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory-karigars"],
    queryFn: () => inventoryService.listKarigars(),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: KarigarInput) => {
      if (editing) return inventoryService.updateKarigar(editing.id, payload);
      return inventoryService.createKarigar(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Karigar updated" : "Karigar created");
      setOpenModal(false);
      setEditing(null);
      form.reset();
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(error.response?.data?.error?.message ?? "Unable to save karigar");
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.reset({ code: "", name: "", specialization: "", mobile: "", goldInHand: 0, pendingReturn: 0, makingDue: 0, isActive: true });
    setOpenModal(true);
  };

  const openEdit = (row: KarigarRow) => {
    setEditing(row);
    form.reset(row);
    setOpenModal(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Karigar Management"
        subtitle="Track gold in hand, pending returns, and making dues"
        actions={<button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={openCreate} type="button">Add Karigar</button>}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load karigar records.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button>
        </div>
      ) : null}

      <DataTable
        columns={[
          col.accessor("code", { header: "Code" }),
          col.accessor("name", { header: "Name" }),
          col.accessor("specialization", { header: "Specialization" }),
          col.accessor("mobile", { header: "Mobile" }),
          col.accessor("goldInHand", { header: "Gold in Hand (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("pendingReturn", { header: "Pending Return" }),
          col.accessor("makingDue", { header: "Making Due", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("isActive", {
            header: "Status",
            cell: (info) => (
              <span className={`rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`}>
                {info.getValue() ? "Active" : "Inactive"}
              </span>
            ),
          }),
        ]}
        data={data}
        loading={isLoading}
        onRowClick={(row) => openEdit(row)}
      />

      {openModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(event) => { if (event.currentTarget === event.target) setOpenModal(false); }}>
          <form className="w-full max-w-3xl rounded-card bg-card p-6 shadow-modal" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <h3 className="mb-4 font-display text-2xl font-semibold">{editing ? "Edit Karigar" : "Add Karigar"}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-muted">Code<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("code")} /></label>
              <label className="text-xs text-muted">Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("name")} /></label>
              <label className="text-xs text-muted">Mobile<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("mobile")} /></label>
              <label className="text-xs text-muted md:col-span-2">Specialization<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("specialization")} /></label>
              <label className="text-xs text-muted">Gold in Hand<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("goldInHand", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Pending Return<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("pendingReturn", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Making Due<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("makingDue", { valueAsNumber: true })} /></label>
              <label className="flex items-center gap-2 pt-6 text-xs text-muted"><input type="checkbox" {...form.register("isActive")} /> Active</label>
            </div>
            <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setOpenModal(false)} type="button">Cancel</button>
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};
