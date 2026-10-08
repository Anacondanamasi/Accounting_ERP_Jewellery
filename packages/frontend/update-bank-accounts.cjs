const fs = require('fs');
let code = fs.readFileSync('src/pages/banking/BankAccountsPage.tsx', 'utf8');

code = code.replace(
  'import { bankingService, type BankAccount } from "@/services/bankingService";',
  'import { bankingService, type BankAccount } from "@/services/bankingService";\nimport { accountsService } from "@/services/accountsService";'
);

code = code.replace(
  'openingBankBalance: z.coerce.number(),',
  'openingBankBalance: z.coerce.number(),\n  accountId: z.coerce.number().min(1, "Chart of Account mapping is required"),'
);

code = code.replace(
  'openingBankBalance: 0,',
  'openingBankBalance: 0,\n      accountId: 0,'
);

code = code.replace(
  'queryFn: () => bankingService.listAccounts(),\n  });',
  'queryFn: () => bankingService.listAccounts(),\n  });\n\n  const { data: accounts } = useQuery({\n    queryKey: ["chart-of-accounts"],\n    queryFn: () => accountsService.list({ type: "BANK" }),\n  });'
);

code = code.replace(
  'bankBalance: payload.openingBankBalance,\n      }),',
  'bankBalance: payload.openingBankBalance,\n        accountId: payload.accountId,\n      }),'
);

code = code.replace(
  '<label className="pt-2 text-[22px] text-charcoal">Opening Balance (Books)</label>',
  '<label className="pt-2 text-[22px] text-ruby">Chart of Account Mapping*</label>\n              <select className="h-12 rounded-lg border border-border px-3 text-lg" {...form.register("accountId", { valueAsNumber: true })}>\n                <option value={0} disabled>Select Ledger Account</option>\n                {accounts?.map((acc: any) => (\n                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>\n                ))}\n              </select>\n\n              <label className="pt-2 text-[22px] text-charcoal">Opening Balance (Books)</label>'
);

fs.writeFileSync('src/pages/banking/BankAccountsPage.tsx', code, 'utf8');
