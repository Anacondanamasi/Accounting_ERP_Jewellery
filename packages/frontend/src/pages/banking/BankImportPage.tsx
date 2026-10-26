import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { bankingService, type BankAccount } from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";

type Step = 1 | 2 | 3;

type PreviewRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

const importFormSchema = z.object({
  bankAccountId: z.coerce.number(),
  format: z.enum(["AUTO", "CSV", "OFX", "QFX", "PDF"]),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

const parseCsvPreview = async (file: File): Promise<PreviewRow[]> => {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (rows.length <= 1) {
    return [];
  }

  const parsed = rows.slice(1).map((line) => {
    const cols = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return {
      date: cols[0] ?? "",
      description: cols[1] ?? "",
      debit: Number(cols[2] ?? 0),
      credit: Number(cols[3] ?? 0),
      balance: Number(cols[4] ?? 0),
    };
  });

  return parsed.filter((row) => row.date && row.description).slice(0, 20);
};

export const BankImportPage = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importSummary, setImportSummary] = useState<{ importedRows: number; duplicatesSkipped: number } | null>(null);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      bankAccountId: Number(searchParams.get("accountId") ?? 1),
      format: "AUTO",
      fromDate: "2025-04-01",
      toDate: "2025-04-30",
    },
  });

  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isError: accountError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["bank-import-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      return bankingService.importStatement(values.bankAccountId, {
        format: values.format,
        fromDate: values.fromDate,
        toDate: values.toDate,
        fileName: selectedFiles[0]?.name ?? null,
        previewRows: preview,
      });
    },
    onSuccess: (result) => {
      setImportSummary({
        importedRows: result.importedRows,
        duplicatesSkipped: result.duplicatesSkipped,
      });
      setStep(3);
      toast.success("Statement imported");
    },
    onError: () => toast.error("Unable to import statement"),
  });

  const selectedAccountId = form.watch("bankAccountId");
  const selectedFormat = form.watch("format");

  const previewRows = useMemo(
    () =>
      preview.length
        ? preview
        : [
            {
              date: "2025-04-28",
              description: "UPI CR KIRAN JEWELS",
              debit: 0,
              credit: 100000,
              balance: 1841850,
            },
            {
              date: "2025-04-27",
              description: "NEFT SHREE BULLION",
              debit: 200000,
              credit: 0,
              balance: 1641850,
            },
          ],
    [preview],
  );

  const onParsePreview = async () => {
    const values = form.getValues();
    const validation = importFormSchema.safeParse(values);
    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        form.setError(issue.path[0] as keyof ImportFormValues, {
          message: issue.message,
        });
      });
      return;
    }

    if (!selectedFiles.length) {
      toast.error("Please upload a statement file first");
      return;
    }

    if (values.format === "CSV" || values.format === "AUTO") {
      const rows = await parseCsvPreview(selectedFiles[0]);
      if (!rows.length) {
        toast.error("Unable to parse preview rows from file");
        return;
      }
      setPreview(rows);
    } else {
      setPreview([]);
    }
    setStep(2);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Import Bank Statement" subtitle={`Step ${step} of 3`} />
      <BankingTabs />

      {accountError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load bank accounts.
          <button className="ml-3 underline" onClick={() => void refetchAccounts()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {step === 1 && (
        <div className="space-y-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted">Account</p>
              <SearchableSelect
                onChange={(value) => form.setValue("bankAccountId", value, { shouldValidate: true })}
                options={accounts.map((row: BankAccount) => ({
                  value: row.id,
                  label: `${row.bankName} - ${row.accountNoMasked}`,
                }))}
                value={selectedAccountId}
              />
              {form.formState.errors.bankAccountId ? (
                <p className="mt-1 text-xs text-ruby">{form.formState.errors.bankAccountId.message}</p>
              ) : null}
            </div>
            <label className="text-xs text-muted">
              Format
              <select
                className="mt-1 h-10 w-full rounded border border-border px-3 text-sm"
                value={selectedFormat}
                onChange={(event) =>
                  form.setValue("format", event.target.value as ImportFormValues["format"], {
                    shouldValidate: true,
                  })
                }
              >
                <option value="AUTO">Auto-detect</option>
                <option value="CSV">CSV</option>
                <option value="OFX">OFX</option>
                <option value="QFX">QFX</option>
                <option value="PDF">PDF (OCR)</option>
              </select>
            </label>
            <div className="text-xs text-muted">
              Date Range
              <div className="mt-1 flex gap-2">
                <input
                  className="h-10 w-full rounded border border-border px-3 text-sm"
                  type="date"
                  value={form.watch("fromDate")}
                  onChange={(event) => form.setValue("fromDate", event.target.value, { shouldValidate: true })}
                />
                <input
                  className="h-10 w-full rounded border border-border px-3 text-sm"
                  type="date"
                  value={form.watch("toDate")}
                  onChange={(event) => form.setValue("toDate", event.target.value, { shouldValidate: true })}
                />
              </div>
            </div>
          </div>
          {accountsLoading ? <p className="text-sm text-muted">Loading accounts...</p> : null}
          {!accountsLoading && accounts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No bank accounts found"
              description="Create at least one bank account before importing statements."
            />
          ) : null}
          <FileUploadZone accept=".csv,.ofx,.qfx,.pdf,.xls,.xlsx" multiple={false} onFilesSelected={setSelectedFiles} />
          <button
            className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50"
            disabled={!selectedFiles.length}
            onClick={() => void onParsePreview()}
            type="button"
          >
            Parse & Preview
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="font-display text-xl font-semibold">Preview & Column Mapping</h3>
          {selectedFormat === "CSV" && (
            <div className="grid gap-3 md:grid-cols-5">
              {["Date", "Description", "Debit", "Credit", "Balance"].map((column) => (
                <label key={column} className="text-xs text-muted">
                  {column}
                  <select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm">
                    <option>{column}</option>
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-gold-tint">
                <tr>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Description</th>
                  <th className="px-2 py-2 text-right">Debit</th>
                  <th className="px-2 py-2 text-right">Credit</th>
                  <th className="px-2 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={`${row.date}-${idx}`} className="border-t border-border">
                    <td className="px-2 py-2">{row.date}</td>
                    <td className="px-2 py-2">{row.description}</td>
                    <td className="px-2 py-2 text-right">{row.debit.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{row.credit.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{row.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            Duplicate detection: probable duplicates are highlighted and skipped on import.
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setStep(1)} type="button">
              Back
            </button>
            <button
              className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50"
              disabled={importMutation.isPending}
              onClick={() => importMutation.mutate()}
              type="button"
            >
              {importMutation.isPending ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="font-display text-2xl font-semibold text-charcoal">Import Successful</h3>
          <p className="text-sm text-muted">
            {importSummary?.importedRows ?? 0} transactions imported, {importSummary?.duplicatesSkipped ?? 0} duplicates skipped.
          </p>
          <Link
            className="inline-flex h-10 items-center rounded-btn bg-gold px-4 text-sm text-white"
            to={`/banking/reconcile?accountId=${selectedAccountId}`}
          >
            Go to Reconciliation
          </Link>
        </div>
      )}
    </div>
  );
};
