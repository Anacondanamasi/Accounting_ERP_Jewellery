import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService, type Integration } from "@/services/settingsService";

const integrationSchema = z.object({
  status: z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]),
  endpoint: z.string().optional(),
  apiKey: z.string().optional(),
});

type IntegrationInput = z.infer<typeof integrationSchema>;

export const IntegrationsPage = () => {
  const [selected, setSelected] = useState<Integration | null>(null);

  const form = useForm<IntegrationInput>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      status: "DISCONNECTED",
      endpoint: "",
      apiKey: "",
    },
  });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["settings-integrations"],
    queryFn: () => settingsService.getIntegrations(),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: IntegrationInput) => settingsService.updateIntegration(selected!.key, payload),
    onSuccess: () => {
      toast.success("Integration updated");
      setSelected(null);
      form.reset();
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => toast.error(error.response?.data?.error?.message ?? "Unable to update integration"),
  });

  const openEdit = (row: Integration) => {
    setSelected(row);
    form.reset({
      status: row.status,
      endpoint: row.endpoint ?? "",
      apiKey: "",
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" subtitle="Connect and manage external services" />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">Failed to load integrations.<button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button></div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((row) => (
          <div key={row.id} className="rounded-card border-t-2 border-t-gold-light bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">{row.name}</h3>
              <span className={`rounded-full px-3 py-1 text-xs ${row.status === "CONNECTED" ? "bg-emerald/10 text-emerald" : row.status === "ERROR" ? "bg-ruby/10 text-ruby" : "bg-gold/10 text-gold"}`}>{row.status}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div><span className="text-muted">Key:</span> {row.key}</div>
              <div><span className="text-muted">Endpoint:</span> {row.endpoint ?? "-"}</div>
              <div><span className="text-muted">API Key:</span> {row.apiKeyMasked ?? "-"}</div>
              <div><span className="text-muted">Configured:</span> {row.configuredAt ? new Date(row.configuredAt).toLocaleString("en-IN") : "-"}</div>
              <div><span className="text-muted">Last Sync:</span> {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString("en-IN") : "-"}</div>
            </div>
            <button className="mt-3 h-9 rounded-btn border border-border px-3 text-sm" onClick={() => openEdit(row)} type="button">Configure</button>
          </div>
        ))}
      </div>

      {isLoading && data.length === 0 ? <div className="rounded-card bg-card p-4 shadow-card text-sm text-muted">Loading integrations...</div> : null}

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <form className="w-full max-w-lg rounded-card bg-card p-6 shadow-modal" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
            <h3 className="mb-4 font-display text-2xl font-semibold">Configure {selected.name}</h3>
            <div className="grid gap-3">
              <label className="text-xs text-muted">Status<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("status")}><option value="CONNECTED">Connected</option><option value="DISCONNECTED">Disconnected</option><option value="ERROR">Error</option></select></label>
              <label className="text-xs text-muted">Endpoint<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("endpoint")} /></label>
              <label className="text-xs text-muted">API Key<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("apiKey")} placeholder="Enter new key to rotate" /></label>
            </div>
            <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setSelected(null)} type="button">Cancel</button>
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={updateMutation.isPending} type="submit">{updateMutation.isPending ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};
