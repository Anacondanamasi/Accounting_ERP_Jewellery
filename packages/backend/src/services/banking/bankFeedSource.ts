export interface RawBankFeedTransaction {
  date: string | Date;
  valueDate?: string | Date;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance?: number;
  payeeHint?: string;
  suggestedCategory?: string;
  suggestedTaxRate?: number;
  memo?: string;
}

export interface BankFeedSourceResult {
  batchId: number;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  openingBalance?: number;
  closingBalance?: number;
  errors: Array<{ row: number; error: string; raw: any }>;
}

export interface BankFeedSource {
  readonly sourceName: string;
  fetchOrImport(
    companyId: number,
    bankAccountId: number,
    payload: any,
    actor: string
  ): Promise<BankFeedSourceResult>;
}
