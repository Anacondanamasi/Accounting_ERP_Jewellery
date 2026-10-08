import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { createBrowserRouter, Navigate } from "react-router-dom";
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
const ProtectedRoute = ({ children }) => {
    const token = useAuthStore((state) => state.token);
    const companies = useAuthStore((state) => state.companies);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    if (!token) {
        return _jsx(Navigate, { replace: true, to: "/login" });
    }
    const activeCompanies = companies.filter((company) => company.membershipStatus === "active");
    if (activeCompanies.length === 0) {
        return _jsx(Navigate, { replace: true, to: "/onboarding/create-company" });
    }
    if (activeCompanies.length > 1 && !currentCompanyId) {
        return _jsx(Navigate, { replace: true, to: "/select-company" });
    }
    return _jsx(_Fragment, { children: children });
};
export const router = createBrowserRouter([
    { path: "/login", element: _jsx(LoginPage, {}) },
    { path: "/register", element: _jsx(RegisterPage, {}) },
    { path: "/verify-email", element: _jsx(VerifyEmailPage, {}) },
    { path: "/invitations/accept", element: _jsx(InvitationAcceptPage, {}) },
    { path: "/select-company", element: _jsx(SelectCompanyPage, {}) },
    { path: "/onboarding/create-company", element: _jsx(CreateCompanyOnboardingPage, {}) },
    { path: "/forgot-password", element: _jsx(ForgotPasswordPage, {}) },
    {
        path: "/",
        element: (_jsx(ProtectedRoute, { children: _jsx(AppLayout, {}) })),
        children: [
            { index: true, element: _jsx(DashboardPage, {}) },
            { path: "accounts", element: _jsx(Navigate, { replace: true, to: "/ledger" }) },
            { path: "journal", element: _jsx(JournalListPage, {}) },
            { path: "journal/new", element: _jsx(JournalEntryForm, {}) },
            { path: "journal/:id/edit", element: _jsx(JournalEntryForm, {}) },
            { path: "expenses", element: _jsx(ExpenseListPage, {}) },
            { path: "expenses/new", element: _jsx(ExpenseFormPage, {}) },
            { path: "ledger", element: _jsx(AccountsPage, {}) },
            { path: "ledger/:accountId", element: _jsx(GeneralLedgerPage, {}) },
            { path: "trial-balance", element: _jsx(TrialBalancePage, {}) },
            { path: "profit-loss", element: _jsx(ProfitLossPage, {}) },
            { path: "balance-sheet", element: _jsx(BalanceSheetPage, {}) },
            { path: "cash-flow", element: _jsx(CashFlowPage, {}) },
            { path: "day-book", element: _jsx(DayBookPage, {}) },
            { path: "invoices", element: _jsx(InvoiceListPage, {}) },
            { path: "invoices/new", element: _jsx(InvoiceFormPage, {}) },
            { path: "invoices/:id", element: _jsx(InvoiceViewPage, {}) },
            { path: "invoices/:id/edit", element: _jsx(InvoiceFormPage, {}) },
            { path: "credit-notes", element: _jsx(CreditNoteListPage, {}) },
            { path: "credit-notes/new", element: _jsx(CreditNoteFormPage, {}) },
            { path: "credit-notes/:id", element: _jsx(CreditNoteViewPage, {}) },
            { path: "credit-notes/:id/edit", element: _jsx(CreditNoteFormPage, {}) },
            { path: "customers", element: _jsx(CustomerListPage, {}) },
            { path: "customers/new", element: _jsx(CustomerFormPage, {}) },
            { path: "customers/:id", element: _jsx(CustomerDetailPage, {}) },
            { path: "customers/:id/edit", element: _jsx(CustomerFormPage, {}) },
            { path: "customer-ledger", element: _jsx(CustomerLedgerPage, {}) },
            { path: "advance-receipts", element: _jsx(AdvanceReceiptsPage, {}) },
            { path: "ageing/receivables", element: _jsx(ReceivablesAgeingPage, {}) },
            { path: "bills", element: _jsx(BillListPage, {}) },
            { path: "bills/new", element: _jsx(BillFormPage, {}) },
            { path: "bills/:id", element: _jsx(BillViewPage, {}) },
            { path: "bills/:id/edit", element: _jsx(BillFormPage, {}) },
            { path: "debit-notes", element: _jsx(DebitNoteListPage, {}) },
            { path: "debit-notes/new", element: _jsx(DebitNoteFormPage, {}) },
            { path: "debit-notes/:id", element: _jsx(DebitNoteViewPage, {}) },
            { path: "debit-notes/:id/edit", element: _jsx(DebitNoteFormPage, {}) },
            { path: "suppliers", element: _jsx(SupplierListPage, {}) },
            { path: "suppliers/:id", element: _jsx(SupplierDetailPage, {}) },
            { path: "advance-payments", element: _jsx(AdvancePaymentsPage, {}) },
            { path: "ageing/payables", element: _jsx(PayablesAgeingPage, {}) },
            { path: "inventory", element: _jsx(InventoryDashboardPage, {}) },
            { path: "inventory/items", element: _jsx(ItemMasterPage, {}) },
            { path: "inventory/ledger", element: _jsx(StockLedgerPage, {}) },
            { path: "inventory/adjust", element: _jsx(AdjustmentListPage, {}) },
            { path: "inventory/adjust/new", element: _jsx(AdjustmentFormPage, {}) },
            { path: "inventory/rates", element: _jsx(MetalRatesPage, {}) },
            { path: "inventory/karigar", element: _jsx(KarigarPage, {}) },
            { path: "inventory/jobwork", element: _jsx(JobWorkPage, {}) },
            { path: "banking", element: _jsx(BankAccountsPage, {}) },
            { path: "banking/transactions", element: _jsx(BankTransactionsPage, {}) },
            { path: "banking/import", element: _jsx(BankImportPage, {}) },
            { path: "banking/reconcile", element: _jsx(BankReconciliationPage, {}) },
            { path: "banking/cheques", element: _jsx(ChequeManagementPage, {}) },
            { path: "tax/gst", element: _jsx(GSTPage, {}) },
            { path: "tax/tds", element: _jsx(TDSPage, {}) },
            { path: "tax/hsn", element: _jsx(HSNMasterPage, {}) },
            { path: "tax/ledger", element: _jsx(TaxLedgerPage, {}) },
            { path: "payroll/employees", element: _jsx(EmployeesPage, {}) },
            { path: "payroll/salary", element: _jsx(SalaryPage, {}) },
            { path: "payroll/loans", element: _jsx(LoansAdvancesPage, {}) },
            { path: "reports", element: _jsx(ReportCentrePage, {}) },
            { path: "reports/custom", element: _jsx(ReportViewerPage, {}) },
            { path: "settings/company", element: _jsx(CompanySettingsPage, {}) },
            { path: "settings/users", element: _jsx(TeamSettingsPage, {}) },
            { path: "settings/team", element: _jsx(TeamSettingsPage, {}) },
            { path: "settings/team/transfer/confirm", element: _jsx(OwnershipTransferConfirmPage, {}) },
            { path: "settings/integrations", element: _jsx(IntegrationsPage, {}) },
            { path: "settings/audit", element: _jsx(AuditLogPage, {}) },
            { path: "schemes", element: _jsx(SchemeListPage, {}) },
            { path: "schemes/members", element: _jsx(SchemeMembersPage, {}) },
            { path: "quotes", element: _jsx(QuoteListPage, {}) },
            { path: "quotes/new", element: _jsx(QuoteFormPage, {}) },
            { path: "quotes/:id/edit", element: _jsx(QuoteFormPage, {}) },
            { path: "purchase-orders", element: _jsx(PurchaseOrderListPage, {}) },
            { path: "purchase-orders/new", element: _jsx(PurchaseOrderFormPage, {}) },
            { path: "purchase-orders/:id/edit", element: _jsx(PurchaseOrderFormPage, {}) },
            { path: "banking/spend", element: _jsx(SpendMoneyPage, {}) },
            { path: "banking/receive", element: _jsx(ReceiveMoneyPage, {}) },
            { path: "banking/transfer", element: _jsx(TransferMoneyPage, {}) },
            { path: "products", element: _jsx(ProductServiceListPage, {}) },
            { path: "products/new", element: _jsx(ProductServiceFormPage, {}) },
            { path: "products/import", element: _jsx(ProductImportPage, {}) },
            { path: "products/:id", element: _jsx(ProductServiceDetailPage, {}) },
            { path: "products/:id/edit", element: _jsx(ProductServiceFormPage, {}) },
        ],
    },
]);
