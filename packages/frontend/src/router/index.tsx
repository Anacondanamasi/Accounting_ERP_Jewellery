import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/authStore";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { SelectCompanyPage } from "@/pages/auth/SelectCompanyPage";
import { CreateCompanyOnboardingPage } from "@/pages/auth/CreateCompanyOnboardingPage";
import { InvitationAcceptPage } from "@/pages/auth/InvitationAcceptPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { AccountsPage } from "@/pages/accounts/AccountsPage";
import { JournalListPage } from "@/pages/journal/JournalListPage";
import { JournalEntryForm } from "@/pages/journal/JournalEntryForm";
import { ExpenseFormPage } from "@/pages/expenses/ExpenseFormPage";
import { ExpenseListPage } from "@/pages/expenses/ExpenseListPage";
import { InvoiceListPage } from "@/pages/invoices/InvoiceListPage";
import { InvoiceFormPage } from "@/pages/invoices/InvoiceFormPage";
import { InvoiceViewPage } from "@/pages/invoices/InvoiceViewPage";
import { CustomerListPage } from "@/pages/customers/CustomerListPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { CustomerFormPage } from "@/pages/customers/CustomerFormPage";
import { BillListPage } from "@/pages/bills/BillListPage";
import { BillFormPage } from "@/pages/bills/BillFormPage";
import { BillViewPage } from "@/pages/bills/BillViewPage";
import { InventoryDashboardPage } from "@/pages/inventory/InventoryDashboardPage";
import { ItemMasterPage } from "@/pages/inventory/ItemMasterPage";
import { StockLedgerPage } from "@/pages/inventory/StockLedgerPage";
import { AdjustmentListPage } from "@/pages/inventory/AdjustmentListPage";
import { AdjustmentFormPage } from "@/pages/inventory/AdjustmentFormPage";
import { MetalRatesPage } from "@/pages/inventory/MetalRatesPage";
import { KarigarPage } from "@/pages/inventory/KarigarPage";
import { JobWorkPage } from "@/pages/inventory/JobWorkPage";
import { BankAccountsPage } from "@/pages/banking/BankAccountsPage";
import { BankTransactionsPage } from "@/pages/banking/BankTransactionsPage";
import { BankImportPage } from "@/pages/banking/BankImportPage";
import { BankReconciliationPage } from "@/pages/banking/BankReconciliationPage";
import { ChequeManagementPage } from "@/pages/banking/ChequeManagementPage";
import { GSTPage } from "@/pages/tax/GSTPage";
import { TDSPage } from "@/pages/tax/TDSPage";
import { HSNMasterPage } from "@/pages/tax/HSNMasterPage";
import { TaxLedgerPage } from "@/pages/tax/TaxLedgerPage";
import { ProfitLossPage } from "@/pages/reports/ProfitLossPage";
import { TrialBalancePage } from "@/pages/reports/TrialBalancePage";
import { BalanceSheetPage } from "@/pages/reports/BalanceSheetPage";
import { CashFlowPage } from "@/pages/reports/CashFlowPage";
import { ReportCentrePage } from "@/pages/reports/ReportCentrePage";
import { ReportViewerPage } from "@/pages/reports/ReportViewerPage";
import { CompanySettingsPage } from "@/pages/settings/CompanySettingsPage";
import { TeamSettingsPage } from "@/pages/settings/TeamSettingsPage";
import { IntegrationsPage } from "@/pages/settings/IntegrationsPage";
import { AuditLogPage } from "@/pages/settings/AuditLogPage";
import { GeneralLedgerPage } from "@/pages/ledger/GeneralLedgerPage";
import { CustomerLedgerPage } from "@/pages/ledger/CustomerLedgerPage";
import { AdvanceReceiptsPage } from "@/pages/advances/AdvanceReceiptsPage";
import { AdvancePaymentsPage } from "@/pages/advances/AdvancePaymentsPage";
import { ReceivablesAgeingPage } from "@/pages/ageing/ReceivablesAgeingPage";
import { SupplierListPage } from "@/pages/suppliers/SupplierListPage";
import { SupplierDetailPage } from "@/pages/suppliers/SupplierDetailPage";
import { PayablesAgeingPage } from "@/pages/ageing/PayablesAgeingPage";
import { DayBookPage } from "@/pages/daybook/DayBookPage";
import { CreditNoteListPage } from "@/pages/creditNotes/CreditNoteListPage";
import { CreditNoteFormPage } from "@/pages/creditNotes/CreditNoteFormPage";
import { CreditNoteViewPage } from "@/pages/creditNotes/CreditNoteViewPage";
import { DebitNoteListPage } from "@/pages/debitNotes/DebitNoteListPage";
import { DebitNoteFormPage } from "@/pages/debitNotes/DebitNoteFormPage";
import { DebitNoteViewPage } from "@/pages/debitNotes/DebitNoteViewPage";
import { EmployeesPage } from "@/pages/payroll/EmployeesPage";
import { SalaryPage } from "@/pages/payroll/SalaryPage";
import { LoansAdvancesPage } from "@/pages/payroll/LoansAdvancesPage";
import { SchemeListPage } from "@/pages/schemes/SchemeListPage";
import { SchemeMembersPage } from "@/pages/schemes/SchemeMembersPage";
import { OwnershipTransferConfirmPage } from "@/pages/settings/OwnershipTransferConfirmPage";
import { QuoteListPage } from "@/pages/quotes/QuoteListPage";
import { QuoteFormPage } from "@/pages/quotes/QuoteFormPage";
import { PurchaseOrderListPage } from "@/pages/purchaseOrders/PurchaseOrderListPage";
import { PurchaseOrderFormPage } from "@/pages/purchaseOrders/PurchaseOrderFormPage";
import { SpendMoneyPage } from "@/pages/banking/SpendMoneyPage";
import { ReceiveMoneyPage } from "@/pages/banking/ReceiveMoneyPage";
import { TransferMoneyPage } from "@/pages/banking/TransferMoneyPage";
import { ProductServiceListPage } from "@/pages/products/ProductServiceListPage";
import { ProductServiceFormPage } from "@/pages/products/ProductServiceFormPage";
import { ProductServiceDetailPage } from "@/pages/products/ProductServiceDetailPage";
import { ProductImportPage } from "@/pages/products/ProductImportPage";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const companies = useAuthStore((state) => state.companies);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  if (!token) {
    return <Navigate replace to="/login" />;
  }
  const activeCompanies = companies.filter((company) => company.membershipStatus === "active");
  if (activeCompanies.length === 0) {
    return <Navigate replace to="/onboarding/create-company" />;
  }
  if (activeCompanies.length > 1 && !currentCompanyId) {
    return <Navigate replace to="/select-company" />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/invitations/accept", element: <InvitationAcceptPage /> },
  { path: "/select-company", element: <SelectCompanyPage /> },
  { path: "/onboarding/create-company", element: <CreateCompanyOnboardingPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "accounts", element: <Navigate replace to="/ledger" /> },
      { path: "journal", element: <JournalListPage /> },
      { path: "journal/new", element: <JournalEntryForm /> },
      { path: "journal/:id/edit", element: <JournalEntryForm /> },
      { path: "expenses", element: <ExpenseListPage /> },
      { path: "expenses/new", element: <ExpenseFormPage /> },
      { path: "ledger", element: <AccountsPage /> },
      { path: "ledger/:accountId", element: <GeneralLedgerPage /> },
      { path: "trial-balance", element: <TrialBalancePage /> },
      { path: "profit-loss", element: <ProfitLossPage /> },
      { path: "balance-sheet", element: <BalanceSheetPage /> },
      { path: "cash-flow", element: <CashFlowPage /> },
      { path: "day-book", element: <DayBookPage /> },
      { path: "invoices", element: <InvoiceListPage /> },
      { path: "invoices/new", element: <InvoiceFormPage /> },
      { path: "invoices/:id", element: <InvoiceViewPage /> },
      { path: "invoices/:id/edit", element: <InvoiceFormPage /> },
      { path: "credit-notes", element: <CreditNoteListPage /> },
      { path: "credit-notes/new", element: <CreditNoteFormPage /> },
      { path: "credit-notes/:id", element: <CreditNoteViewPage /> },
      { path: "credit-notes/:id/edit", element: <CreditNoteFormPage /> },
      { path: "customers", element: <CustomerListPage /> },
      { path: "customers/new", element: <CustomerFormPage /> },
      { path: "customers/:id", element: <CustomerDetailPage /> },
      { path: "customers/:id/edit", element: <CustomerFormPage /> },
      { path: "customer-ledger", element: <CustomerLedgerPage /> },
      { path: "advance-receipts", element: <AdvanceReceiptsPage /> },
      { path: "ageing/receivables", element: <ReceivablesAgeingPage /> },
      { path: "bills", element: <BillListPage /> },
      { path: "bills/new", element: <BillFormPage /> },
      { path: "bills/:id", element: <BillViewPage /> },
      { path: "bills/:id/edit", element: <BillFormPage /> },
      { path: "debit-notes", element: <DebitNoteListPage /> },
      { path: "debit-notes/new", element: <DebitNoteFormPage /> },
      { path: "debit-notes/:id", element: <DebitNoteViewPage /> },
      { path: "debit-notes/:id/edit", element: <DebitNoteFormPage /> },
      { path: "suppliers", element: <SupplierListPage /> },
      { path: "suppliers/:id", element: <SupplierDetailPage /> },
      { path: "advance-payments", element: <AdvancePaymentsPage /> },
      { path: "ageing/payables", element: <PayablesAgeingPage /> },
      { path: "inventory", element: <InventoryDashboardPage /> },
      { path: "inventory/items", element: <ItemMasterPage /> },
      { path: "inventory/ledger", element: <StockLedgerPage /> },
      { path: "inventory/adjust", element: <AdjustmentListPage /> },
      { path: "inventory/adjust/new", element: <AdjustmentFormPage /> },
      { path: "inventory/rates", element: <MetalRatesPage /> },
      { path: "inventory/karigar", element: <KarigarPage /> },
      { path: "inventory/jobwork", element: <JobWorkPage /> },
      { path: "banking", element: <BankAccountsPage /> },
      { path: "banking/transactions", element: <BankTransactionsPage /> },
      { path: "banking/import", element: <BankImportPage /> },
      { path: "banking/reconcile", element: <BankReconciliationPage /> },
      { path: "banking/cheques", element: <ChequeManagementPage /> },
      { path: "tax/gst", element: <GSTPage /> },
      { path: "tax/tds", element: <TDSPage /> },
      { path: "tax/hsn", element: <HSNMasterPage /> },
      { path: "tax/ledger", element: <TaxLedgerPage /> },
      { path: "payroll/employees", element: <EmployeesPage /> },
      { path: "payroll/salary", element: <SalaryPage /> },
      { path: "payroll/loans", element: <LoansAdvancesPage /> },
      { path: "reports", element: <ReportCentrePage /> },
      { path: "reports/custom", element: <ReportViewerPage /> },
      { path: "settings/company", element: <CompanySettingsPage /> },
      { path: "settings/users", element: <TeamSettingsPage /> },
      { path: "settings/team", element: <TeamSettingsPage /> },
      { path: "settings/team/transfer/confirm", element: <OwnershipTransferConfirmPage /> },
      { path: "settings/integrations", element: <IntegrationsPage /> },
      { path: "settings/audit", element: <AuditLogPage /> },
      { path: "schemes", element: <SchemeListPage /> },
      { path: "schemes/members", element: <SchemeMembersPage /> },
      { path: "quotes", element: <QuoteListPage /> },
      { path: "quotes/new", element: <QuoteFormPage /> },
      { path: "quotes/:id/edit", element: <QuoteFormPage /> },
      { path: "purchase-orders", element: <PurchaseOrderListPage /> },
      { path: "purchase-orders/new", element: <PurchaseOrderFormPage /> },
      { path: "purchase-orders/:id/edit", element: <PurchaseOrderFormPage /> },
      { path: "banking/spend", element: <SpendMoneyPage /> },
      { path: "banking/receive", element: <ReceiveMoneyPage /> },
      { path: "banking/transfer", element: <TransferMoneyPage /> },
      { path: "products", element: <ProductServiceListPage /> },
      { path: "products/new", element: <ProductServiceFormPage /> },
      { path: "products/import", element: <ProductImportPage /> },
      { path: "products/:id", element: <ProductServiceDetailPage /> },
      { path: "products/:id/edit", element: <ProductServiceFormPage /> },
    ],
  },
]);
