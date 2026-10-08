import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { X, Landmark, CreditCard, Building2, HelpCircle } from "lucide-react";
import { accountsService } from "@/services/accountsService";
import { bankingService } from "@/services/bankingService";

const bankAccountSchema = z.object({
  accountFormType: z.enum(["BANK", "CREDIT_CARD"]),
  accountName: z.string().min(1, "Account name is required"),
  accountCode: z.string().min(1, "Account code is required"),
  currency: z.string().min(1, "Currency is required"),
  accountNumber: z.string().min(4, "Account number should have at least 4 characters"),
  bankName: z.string().min(1, "Bank name is required"),
  ifsc: z.string().min(4, "IFSC/routing code should have at least 4 characters"),
  description: z.string().max(500).optional(),
  makePrimary: z.boolean().default(false),
  openingBookBalance: z.coerce.number().default(0),
  openingBankBalance: z.coerce.number().default(0),
  mappingType: z.enum(["new", "existing"]),
  accountId: z.coerce.number().optional(),
  groupId: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.mappingType === "existing") {
    if (!data.accountId || data.accountId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountId"],
        message: "Ledger account mapping is required",
      });
    }
  } else {
    if (!data.groupId || data.groupId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Bank Account Group is required",
      });
    }
  }
});

type BankAccountInput = z.infer<typeof bankAccountSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BankAccountFormModal = ({ isOpen, onClose }: Props) => {
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ["account-groups"],
    queryFn: () => accountsService.listGroups(),
    enabled: isOpen,
  });

  const { data: allAccounts = [] } = useQuery<any[]>({
    queryKey: ["accounts"],
    queryFn: () => accountsService.list({}),
    enabled: isOpen,
  });

  const form = useForm<BankAccountInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountFormType: "BANK",
      accountName: "",
      accountCode: "",
      currency: "INR",
      accountNumber: "",
      bankName: "",
      ifsc: "",
      description: "",
      makePrimary: false,
      openingBookBalance: 0,
      openingBankBalance: 0,
      mappingType: "new",
      accountId: 0,
      groupId: 0,
    },
  });

  const watchAccountFormType = form.watch("accountFormType");
  const watchMappingType = form.watch("mappingType");

  useEffect(() => {
    if (isOpen) {
      form.reset({
        accountFormType: "BANK",
        accountName: "",
        accountCode: "",
        currency: "INR",
        accountNumber: "",
        bankName: "",
        ifsc: "",
        description: "",
        makePrimary: false,
        openingBookBalance: 0,
        openingBankBalance: 0,
        mappingType: "new",
        accountId: 0,
        groupId: 0,
      });
    }
  }, [isOpen, form]);

  const bankGroups = useMemo(() => {
    return groups.filter(
      (g) => g.type === "Current Asset" || g.type === "Bank" || g.name.toLowerCase().includes("bank")
    );
  }, [groups]);

  const creditCardGroups = useMemo(() => {
    return groups.filter(
      (g) =>
        g.type === "Current Liability" ||
        g.type === "Liability" ||
        g.name.toLowerCase().includes("credit") ||
        g.name.toLowerCase().includes("card")
    );
  }, [groups]);

  const targetGroups = useMemo(() => {
    return watchAccountFormType === "CREDIT_CARD" ? creditCardGroups : bankGroups;
  }, [watchAccountFormType, bankGroups, creditCardGroups]);

  const ledgerAccounts = useMemo(() => {
    if (watchAccountFormType === "CREDIT_CARD") {
      return allAccounts.filter(
        (acc) =>
          acc.type?.toLowerCase().includes("liability") ||
          acc.group?.toLowerCase().includes("liability") ||
          acc.group?.toLowerCase().includes("credit card")
      );
    } else {
      return allAccounts.filter(
        (acc) =>
          acc.type === "Bank" ||
          acc.isBankAccount ||
          acc.group?.toLowerCase().includes("bank")
      );
    }
  }, [allAccounts, watchAccountFormType]);

  const mutation = useMutation({
    mutationFn: async (data: BankAccountInput) => {
      let mappedAccountId = data.accountId;

      if (data.mappingType === "new") {
        // Create a new Account in the Chart of Accounts
        const newAccount = await accountsService.create({
          code: data.accountCode,
          name: data.accountName,
          description: data.description || `Bank Account: ${data.accountNumber}`,
          groupId: data.groupId || null,
          type: data.accountFormType === "CREDIT_CARD" ? "Liability" : "Bank",
          openingBalance: data.openingBookBalance,
          taxCode: "Tax Exempt (0%)",
          isBankAccount: true,
          enablePayments: true,
          showOnDashboard: true,
          isActive: true,
          allowManualJournals: true,
        });
        mappedAccountId = newAccount.id;
      }

      // Create BankAccount record linked to the new or existing Account
      return bankingService.createAccount({
        bankName: data.bankName,
        accountName: data.accountName,
        accountNo: data.accountNumber,
        accountNoMasked: data.accountNumber,
        ifsc: data.ifsc,
        accountType: data.accountFormType === "CREDIT_CARD" ? "CASH_CREDIT" : "CURRENT",
        bookBalance: data.openingBookBalance,
        bankBalance: data.openingBankBalance,
        accountId: mappedAccountId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Bank account created and mapped successfully");
      onClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error?.message ?? "Unable to save bank account";
      const details = error?.response?.data?.error?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        toast.error(`${msg}: ${details[0].message} (${details[0].path.join(".")})`);
      } else {
        toast.error(msg);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-card overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-canvas/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {watchAccountFormType === "CREDIT_CARD" ? (
              <CreditCard className="h-6 w-6 text-gold" />
            ) : (
              <Landmark className="h-6 w-6 text-gold" />
            )}
            <h2 className="text-xl font-bold text-charcoal">Add Bank or Credit Card</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:bg-canvas transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Account Basics */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted border-b border-border pb-1">
                Account Details
              </h3>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Select Account Type <span className="text-ruby">*</span>
                </label>
                <div className="flex items-center gap-4 py-1.5">
                  <label className="flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer">
                    <input
                      type="radio"
                      value="BANK"
                      className="text-gold focus:ring-gold"
                      {...form.register("accountFormType")}
                    />
                    <span>Bank Account</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer">
                    <input
                      type="radio"
                      value="CREDIT_CARD"
                      className="text-gold focus:ring-gold"
                      {...form.register("accountFormType")}
                    />
                    <span>Credit Card</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Account Name <span className="text-ruby">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Business checking"
                  className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors"
                  {...form.register("accountName")}
                />
                {form.formState.errors.accountName && (
                  <p className="mt-1 text-xs text-ruby">{form.formState.errors.accountName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Account Code <span className="text-ruby">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1002"
                  className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors font-mono"
                  {...form.register("accountCode")}
                />
                {form.formState.errors.accountCode && (
                  <p className="mt-1 text-xs text-ruby">{form.formState.errors.accountCode.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Currency <span className="text-ruby">*</span>
                  </label>
                  <select
                    className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none bg-white transition-colors"
                    {...form.register("currency")}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="AED">AED</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">IFSC / Code</label>
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors"
                    {...form.register("ifsc")}
                  />
                  {form.formState.errors.ifsc && (
                    <p className="mt-1 text-xs text-ruby">{form.formState.errors.ifsc.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Description</label>
                <textarea
                  placeholder="Details or notes about this bank/card"
                  rows={2}
                  className="w-full rounded-btn border border-border p-3 text-sm focus:border-gold outline-none transition-colors"
                  {...form.register("description")}
                />
              </div>
            </div>

            {/* Right Column: Bank Details & COA Mapping */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted border-b border-border pb-1">
                Bank Details & Mapping
              </h3>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Bank Name <span className="text-ruby">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors"
                  {...form.register("bankName")}
                />
                {form.formState.errors.bankName && (
                  <p className="mt-1 text-xs text-ruby">{form.formState.errors.bankName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Account Number <span className="text-ruby">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full Account Number"
                  className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors"
                  {...form.register("accountNumber")}
                />
                {form.formState.errors.accountNumber && (
                  <p className="mt-1 text-xs text-ruby">{form.formState.errors.accountNumber.message}</p>
                )}
              </div>

              <div className="border border-gold-tint bg-gold-tint/10 rounded-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gold">
                    Chart of Accounts Mapping <span className="text-ruby">*</span>
                  </label>
                  <select
                    className="text-xs font-semibold text-sapphire border border-border bg-white rounded px-2 py-1 outline-none"
                    {...form.register("mappingType")}
                  >
                    <option value="new">Create New Account</option>
                    <option value="existing">Map Existing Account</option>
                  </select>
                </div>

                {watchMappingType === "existing" ? (
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Select Ledger Account</label>
                    <select
                      className="h-9 w-full rounded-btn border border-border px-3 text-sm focus:border-gold bg-white outline-none"
                      {...form.register("accountId", { valueAsNumber: true })}
                    >
                      <option value={0}>-- Select Ledger Account --</option>
                      {ledgerAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code})
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.accountId && (
                      <p className="mt-1 text-xs text-ruby">{form.formState.errors.accountId.message}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Bank Account Group</label>
                    <select
                      className="h-9 w-full rounded-btn border border-border px-3 text-sm focus:border-gold bg-white outline-none"
                      {...form.register("groupId", { valueAsNumber: true })}
                    >
                      <option value={0}>-- Select Group --</option>
                      {targetGroups.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.groupId && (
                      <p className="mt-1 text-xs text-ruby">{form.formState.errors.groupId.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Opening Balance (Books)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none"
                    {...form.register("openingBookBalance", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Opening Balance (Bank)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none"
                    {...form.register("openingBankBalance", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border text-gold focus:ring-gold"
                    {...form.register("makePrimary")}
                  />
                  <span>Make this primary</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <button
              onClick={onClose}
              className="h-10 rounded-btn border border-border px-6 text-sm font-semibold hover:bg-canvas transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={mutation.isPending}
              className="inline-flex h-10 items-center justify-center rounded-btn bg-gold px-6 text-sm font-bold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-60 transition-colors"
              type="submit"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
