import {
  Activity,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowUpDown,
  BarChart2,
  BarChart3,
  BookMarked,
  BookOpen,
  Building,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  FileEdit,
  FileMinus,
  FilePlus,
  FileText,
  Gem,
  Hammer,
  HandCoins,
  Hash,
  Landmark,
  LayoutDashboard,
  List,
  Lock,
  Package,
  Percent,
  Plug,
  Receipt,
  Scale,
  ScrollText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Truck,
  Upload,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_ITEMS: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    group: "SALES & RECEIVABLES",
    items: [
      { label: "Products & Services", path: "/products", icon: Tag },
      { label: "Sales Invoices", path: "/invoices", icon: Receipt },
      { label: "Quotes", path: "/quotes", icon: FileText },
      { label: "Credit Notes", path: "/credit-notes", icon: FileMinus },
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Payment Receipts", path: "/advance-receipts", icon: Wallet },
    ],
  },
  {
    group: "PURCHASES & PAYABLES",
    items: [
      { label: "Purchase Bills", path: "/bills", icon: ShoppingCart },
      { label: "Purchase Orders", path: "/purchase-orders", icon: ClipboardList },
      { label: "Debit Notes", path: "/debit-notes", icon: FilePlus },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Advance Payments", path: "/advance-payments", icon: CreditCard },
      { label: "Expenses", path: "/expenses", icon: CreditCard },
    ],
  },
  {
    group: "FIXED ASSETS",
    items: [
      { label: "Asset Register", path: "/assets", icon: Building2 },
      { label: "Statutory Reports", path: "/assets/reports", icon: BookMarked },
    ],
  },
  {
    group: "INVENTORY",
    items: [
      { label: "Inventory Dashboard", path: "/inventory", icon: Gem },
      { label: "Item Master", path: "/inventory/items", icon: Package },
      { label: "Stock Ledger", path: "/inventory/ledger", icon: List },
      { label: "Adjustments", path: "/inventory/adjust", icon: Sliders },
      { label: "Metal Rates", path: "/inventory/rates", icon: BarChart3 },
      { label: "Karigar Management", path: "/inventory/karigar", icon: Hammer },
      { label: "Job Work", path: "/inventory/jobwork", icon: Wrench },
    ],
  },
  {
    group: "BANKING",
    items: [
      { label: "Bank Accounts", path: "/banking", icon: Landmark },
      { label: "Transactions", path: "/banking/transactions", icon: ArrowUpDown },
      { label: "Bank Rules", path: "/banking/rules", icon: Sparkles },
      { label: "Spend Money", path: "/banking/spend", icon: ArrowUpCircle },
      { label: "Receive Money", path: "/banking/receive", icon: ArrowDownCircle },
      { label: "Transfer Money", path: "/banking/transfer", icon: ArrowLeftRight },
      { label: "Import Statement", path: "/banking/import", icon: Upload },
      { label: "Reconciliation", path: "/banking/reconcile", icon: CheckSquare },
      { label: "Cheque Management", path: "/banking/cheques", icon: FileCheck },
    ],
  },
  {
    group: "TAX & COMPLIANCE",
    items: [
      { label: "GST Returns", path: "/tax/gst", icon: ShieldCheck },
      { label: "TDS Management", path: "/tax/tds", icon: Percent },
      { label: "HSN/SAC Master", path: "/tax/hsn", icon: Hash },
      { label: "Tax Ledger", path: "/tax/ledger", icon: FileText },
    ],
  },
  {
    group: "PAYROLL",
    items: [
      { label: "Employees", path: "/payroll/employees", icon: UserCheck },
      { label: "Salary Processing", path: "/payroll/salary", icon: DollarSign },
      { label: "Loans & Advances", path: "/payroll/loans", icon: HandCoins },
    ],
  },
  {
    group: "REPORTS",
    items: [
      { label: "Report Centre", path: "/reports", icon: BarChart2 },
      { label: "Custom Reports", path: "/reports/custom", icon: Settings2 },
      { label: "Receivables Ageing", path: "/ageing/receivables", icon: Clock },
      { label: "Payables Ageing", path: "/ageing/payables", icon: Clock },
      { label: "Journal Entry", path: "/journal", icon: FileEdit },
    ],
  },
  {
    group: "SETTINGS",
    items: [
      { label: "Company Settings", path: "/settings/company", icon: Building },
      { label: "Team Management", path: "/settings/team", icon: Lock },
      { label: "Integrations", path: "/settings/integrations", icon: Plug },
      { label: "Audit Log", path: "/settings/audit", icon: Activity },
      { label: "Gold Schemes", path: "/schemes", icon: Star },
      { label: "Scheme Members", path: "/schemes/members", icon: Users },
      { label: "Chart of Accounts", path: "/ledger", icon: BookOpen },
    ],
  },
];
