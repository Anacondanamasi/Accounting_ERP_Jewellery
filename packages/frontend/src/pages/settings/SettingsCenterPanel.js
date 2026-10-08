import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
const sectionsCatalog = [
    { key: "general_settings", label: "General Settings", category: "Core", mode: "single", description: "Company profile and defaults.", tags: ["company"] },
    { key: "financial_settings", label: "Financial Settings", category: "Accounting", mode: "single", description: "Accounting method and policy controls.", tags: ["financial"] },
    { key: "tax_settings", label: "Tax Settings", category: "Tax", mode: "multiple", description: "Tax rates and jurisdiction setup.", tags: ["tax"] },
    { key: "invoice_settings", label: "Invoice Settings", category: "Sales", mode: "single", description: "Sales invoice defaults.", tags: ["invoice"] },
    { key: "credit_note_settings", label: "Credit Note Settings", category: "Sales", mode: "single", description: "Credit note behavior.", tags: ["credit note"] },
    { key: "quote_settings", label: "Quote Settings", category: "Sales", mode: "single", description: "Quotation defaults and lifecycle.", tags: ["quotes"] },
    { key: "purchase_settings", label: "Purchase Settings", category: "Purchases", mode: "single", description: "Bill and vendor purchase defaults.", tags: ["purchase"] },
    { key: "chart_of_accounts", label: "Chart of Accounts", category: "Accounting", mode: "single", description: "COA policies and configuration.", tags: ["coa"] },
    { key: "bank_accounts", label: "Bank Accounts", category: "Accounting", mode: "multiple", description: "Bank setup and defaults.", tags: ["bank"] },
    { key: "payment_methods", label: "Payment Methods", category: "Platform", mode: "multiple", description: "Payment provider configuration.", tags: ["payment"] },
    { key: "currencies", label: "Currencies", category: "Accounting", mode: "multiple", description: "Currency master.", tags: ["currency"] },
    { key: "exchange_rates", label: "Exchange Rates", category: "Accounting", mode: "multiple", description: "FX rates and history.", tags: ["fx"] },
    { key: "tracking_categories", label: "Tracking Categories", category: "Accounting", mode: "multiple", description: "Dimensions for reporting.", tags: ["tracking"] },
    { key: "custom_fields", label: "Custom Fields", category: "Platform", mode: "multiple", description: "Entity-level custom fields.", tags: ["custom"] },
    { key: "document_numbering", label: "Document Numbering", category: "Accounting", mode: "single", description: "Prefixes and sequences.", tags: ["numbering"] },
    { key: "branding_themes", label: "Branding Themes", category: "Sales", mode: "multiple", description: "Document appearance and theme.", tags: ["branding"] },
    { key: "email_templates", label: "Email Templates", category: "Sales", mode: "multiple", description: "Transactional templates.", tags: ["email"] },
    { key: "users_permissions", label: "Users & Permissions", category: "Governance", mode: "single", description: "User policy controls.", tags: ["users"] },
    { key: "approval_workflows", label: "Approval Workflows", category: "Governance", mode: "multiple", description: "Approval chains and thresholds.", tags: ["approvals"] },
    { key: "roles_access_control", label: "Roles & Access Control", category: "Governance", mode: "single", description: "RBAC strategy and role policy.", tags: ["roles"] },
    { key: "audit_log", label: "Audit Log", category: "Governance", mode: "single", description: "Audit controls and retention.", tags: ["audit"] },
    { key: "attachments_storage", label: "Attachments & Storage", category: "Data", mode: "single", description: "Storage policy and limits.", tags: ["storage"] },
    { key: "integrations", label: "Integrations", category: "Platform", mode: "multiple", description: "Third-party integration center.", tags: ["integrations"] },
    { key: "api_webhooks", label: "API & Webhooks", category: "Platform", mode: "single", description: "API keys and webhooks.", tags: ["api"] },
    { key: "import_export", label: "Import & Export", category: "Data", mode: "single", description: "Data interchange settings.", tags: ["import"] },
    { key: "data_migration", label: "Data Migration", category: "Data", mode: "single", description: "Migration wizard setup.", tags: ["migration"] },
    { key: "automation_rules", label: "Automation Rules", category: "Platform", mode: "multiple", description: "Rule-based automation.", tags: ["automation"] },
    { key: "notifications", label: "Notifications", category: "Platform", mode: "single", description: "Alerts and reminder settings.", tags: ["notifications"] },
    { key: "company_documents", label: "Company Documents", category: "Data", mode: "multiple", description: "Compliance documents.", tags: ["documents"] },
    { key: "fiscal_year_settings", label: "Fiscal Year Settings", category: "Accounting", mode: "single", description: "Fiscal year and close policy.", tags: ["fiscal"] },
    { key: "accounting_lock_dates", label: "Accounting Lock Dates", category: "Governance", mode: "single", description: "Soft/hard lock dates.", tags: ["lock"] },
    { key: "opening_balances", label: "Opening Balances", category: "Accounting", mode: "single", description: "Opening balance controls.", tags: ["opening"] },
    { key: "backup_restore", label: "Backup & Restore", category: "Data", mode: "single", description: "Backup and restore points.", tags: ["backup"] },
    { key: "subscription_billing", label: "Subscription & Billing", category: "Core", mode: "single", description: "Plan and billing configuration.", tags: ["subscription"] },
    { key: "multi_entity_management", label: "Multi-Entity Management", category: "Enterprise", mode: "single", description: "Entity hierarchy controls.", tags: ["entity"] },
    { key: "consolidated_reporting", label: "Consolidated Reporting", category: "Enterprise", mode: "single", description: "Group reporting setup.", tags: ["consolidation"] },
    { key: "intercompany_transactions", label: "Inter-Company Transactions", category: "Enterprise", mode: "single", description: "Intercompany rules.", tags: ["intercompany"] },
    { key: "client_portal", label: "Client Portal", category: "Enterprise", mode: "single", description: "Client access configuration.", tags: ["portal"] },
    { key: "e_signature_settings", label: "E-Signature Settings", category: "Enterprise", mode: "single", description: "Signature policies.", tags: ["esign"] },
    { key: "ai_automation_settings", label: "AI Automation Settings", category: "Enterprise", mode: "single", description: "AI policy and controls.", tags: ["ai"] },
    { key: "ocr_settings", label: "OCR Settings", category: "Enterprise", mode: "single", description: "OCR extraction policies.", tags: ["ocr"] },
    { key: "bank_rule_engine", label: "Bank Rule Engine", category: "Enterprise", mode: "multiple", description: "Bank matching rule engine.", tags: ["bank rules"] },
    { key: "recurring_transactions", label: "Recurring Transactions", category: "Enterprise", mode: "multiple", description: "Recurring transaction templates.", tags: ["recurring"] },
    { key: "workflow_builder", label: "Workflow Builder", category: "Enterprise", mode: "multiple", description: "Cross-module workflow automation.", tags: ["workflow"] },
    { key: "custom_report_builder", label: "Custom Report Builder", category: "Enterprise", mode: "single", description: "Report design controls.", tags: ["reports"] },
];
const categoryOrder = [
    "Core",
    "Accounting",
    "Tax",
    "Sales",
    "Purchases",
    "Governance",
    "Platform",
    "Data",
    "Enterprise",
];
const slugifyKey = (raw) => raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default";
const toJsonString = (value) => JSON.stringify(value, null, 2);
const parsePayload = (json) => {
    try {
        const parsed = JSON.parse(json);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { ok: true, data: parsed };
        }
        return { ok: false, error: "Payload must be a JSON object." };
    }
    catch {
        return { ok: false, error: "Invalid JSON format." };
    }
};
const defaultRecord = (section) => ({
    id: "virtual-default",
    recordKey: "default",
    payload: {},
    status: "ACTIVE",
    sortOrder: 0,
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
});
const readStore = (companyId) => {
    const key = `settings-center-local:${companyId ?? "default"}`;
    const raw = localStorage.getItem(key);
    if (!raw)
        return { favorites: [], recent: [], recordsBySection: {} };
    try {
        const parsed = JSON.parse(raw);
        return {
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
            recent: Array.isArray(parsed.recent) ? parsed.recent : [],
            recordsBySection: parsed.recordsBySection ?? {},
        };
    }
    catch {
        return { favorites: [], recent: [], recordsBySection: {} };
    }
};
const writeStore = (companyId, store) => {
    const key = `settings-center-local:${companyId ?? "default"}`;
    localStorage.setItem(key, JSON.stringify(store));
};
export const SettingsCenterPanel = () => {
    const companies = useAuthStore((state) => state.companies);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    const currentCompany = companies.find((company) => company.id === currentCompanyId);
    const role = (currentCompany?.role ?? "").toLowerCase();
    const canManage = role === "owner" || role === "admin";
    const initialStore = useMemo(() => readStore(currentCompanyId), [currentCompanyId]);
    const [favorites, setFavorites] = useState(initialStore.favorites);
    const [recent, setRecent] = useState(initialStore.recent);
    const [recordsBySection, setRecordsBySection] = useState(initialStore.recordsBySection);
    const [selectedSection, setSelectedSection] = useState(sectionsCatalog[0].key);
    const [selectedRecordKey, setSelectedRecordKey] = useState("default");
    const [searchTerm, setSearchTerm] = useState("");
    const [draftRecordKey, setDraftRecordKey] = useState("default");
    const [draftStatus, setDraftStatus] = useState("ACTIVE");
    const [draftSortOrder, setDraftSortOrder] = useState(0);
    const [draftEffectiveFrom, setDraftEffectiveFrom] = useState("");
    const [draftEffectiveTo, setDraftEffectiveTo] = useState("");
    const [draftJson, setDraftJson] = useState("{}");
    const persist = (next) => {
        const merged = {
            favorites: next.favorites ?? favorites,
            recent: next.recent ?? recent,
            recordsBySection: next.recordsBySection ?? recordsBySection,
        };
        writeStore(currentCompanyId, merged);
    };
    const selectedSectionDef = sectionsCatalog.find((s) => s.key === selectedSection) ?? sectionsCatalog[0];
    const sectionRecords = recordsBySection[selectedSection] ?? (selectedSectionDef.mode === "single" ? [defaultRecord(selectedSectionDef)] : []);
    const activeRecord = sectionRecords.find((r) => r.recordKey === selectedRecordKey) ?? sectionRecords[0] ?? null;
    const groupedSections = useMemo(() => {
        const groups = new Map();
        sectionsCatalog.forEach((section) => {
            const current = groups.get(section.category) ?? [];
            current.push(section);
            groups.set(section.category, current);
        });
        return groups;
    }, []);
    const touchRecent = (sectionKey) => {
        const nextRecent = [sectionKey, ...recent.filter((item) => item !== sectionKey)].slice(0, 20);
        setRecent(nextRecent);
        persist({ recent: nextRecent });
    };
    const openSection = (sectionKey) => {
        setSelectedSection(sectionKey);
        touchRecent(sectionKey);
        const section = sectionsCatalog.find((s) => s.key === sectionKey) ?? sectionsCatalog[0];
        const records = recordsBySection[sectionKey] ?? (section.mode === "single" ? [defaultRecord(section)] : []);
        const first = records[0];
        setSelectedRecordKey(first?.recordKey ?? "default");
        setDraftRecordKey(first?.recordKey ?? "default");
        setDraftJson(toJsonString(first?.payload ?? {}));
        setDraftStatus(first?.status ?? "ACTIVE");
        setDraftSortOrder(first?.sortOrder ?? 0);
        setDraftEffectiveFrom(first?.effectiveFrom?.slice(0, 10) ?? "");
        setDraftEffectiveTo(first?.effectiveTo?.slice(0, 10) ?? "");
    };
    const toggleFavorite = () => {
        const next = favorites.includes(selectedSection)
            ? favorites.filter((item) => item !== selectedSection)
            : [selectedSection, ...favorites].slice(0, 15);
        setFavorites(next);
        persist({ favorites: next });
    };
    const beginEdit = (record) => {
        setSelectedRecordKey(record.recordKey);
        setDraftRecordKey(record.recordKey);
        setDraftJson(toJsonString(record.payload));
        setDraftStatus(record.status);
        setDraftSortOrder(record.sortOrder);
        setDraftEffectiveFrom(record.effectiveFrom?.slice(0, 10) ?? "");
        setDraftEffectiveTo(record.effectiveTo?.slice(0, 10) ?? "");
    };
    const beginNewRecord = () => {
        setSelectedRecordKey("");
        setDraftRecordKey("new-record");
        setDraftJson("{}");
        setDraftStatus("ACTIVE");
        setDraftSortOrder(0);
        setDraftEffectiveFrom("");
        setDraftEffectiveTo("");
    };
    const saveRecord = () => {
        if (!canManage)
            return;
        const parsed = parsePayload(draftJson);
        if (!parsed.ok) {
            toast.error(parsed.error);
            return;
        }
        const section = selectedSectionDef;
        const now = new Date().toISOString();
        const key = section.mode === "single" ? "default" : slugifyKey(draftRecordKey);
        if (!key) {
            toast.error("Record key is required.");
            return;
        }
        const current = recordsBySection[selectedSection] ?? [];
        const existing = current.find((r) => r.recordKey === key);
        const updated = {
            id: existing?.id ?? `${selectedSection}:${key}:${Date.now()}`,
            recordKey: key,
            payload: parsed.data,
            status: draftStatus,
            sortOrder: draftSortOrder,
            effectiveFrom: draftEffectiveFrom ? `${draftEffectiveFrom}T00:00:00.000Z` : null,
            effectiveTo: draftEffectiveTo ? `${draftEffectiveTo}T00:00:00.000Z` : null,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        const nextSectionRecords = section.mode === "single"
            ? [updated]
            : [...current.filter((r) => r.recordKey !== key), updated].sort((a, b) => a.sortOrder - b.sortOrder);
        const nextRecordsBySection = { ...recordsBySection, [selectedSection]: nextSectionRecords };
        setRecordsBySection(nextRecordsBySection);
        persist({ recordsBySection: nextRecordsBySection });
        setSelectedRecordKey(key);
        toast.success("Settings saved locally.");
    };
    const archiveRecord = () => {
        if (!canManage || selectedSectionDef.mode !== "multiple" || !activeRecord)
            return;
        const current = recordsBySection[selectedSection] ?? [];
        const nextSectionRecords = current.filter((record) => record.recordKey !== activeRecord.recordKey);
        const nextRecordsBySection = { ...recordsBySection, [selectedSection]: nextSectionRecords };
        setRecordsBySection(nextRecordsBySection);
        persist({ recordsBySection: nextRecordsBySection });
        beginNewRecord();
        toast.success("Record archived locally.");
    };
    const searchResults = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (q.length < 2)
            return [];
        const bySection = sectionsCatalog
            .filter((section) => section.label.toLowerCase().includes(q) ||
            section.description.toLowerCase().includes(q) ||
            section.tags.some((tag) => tag.toLowerCase().includes(q)))
            .map((section) => ({ type: "section", section: section.key, label: section.label, description: section.description }));
        return bySection.slice(0, 10);
    }, [searchTerm]);
    const isFavorite = favorites.includes(selectedSection);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700", children: "Running in local mode because settings-center API endpoints are unavailable (prevents 404 errors)." }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]", children: [_jsxs("aside", { className: "space-y-4 rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("label", { className: "text-xs font-medium text-muted", children: "Search all settings" }), _jsx("input", { className: "h-10 w-full rounded border border-border px-3 text-sm", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) }), searchTerm.trim().length >= 2 ? (_jsx("div", { className: "space-y-2 rounded border border-border/70 bg-muted/10 p-3", children: searchResults.map((result, i) => (_jsxs("button", { type: "button", className: "block w-full text-left text-xs", onClick: () => { openSection(result.section); setSearchTerm(""); }, children: [_jsx("div", { className: "font-medium", children: result.label }), _jsx("div", { className: "text-muted", children: result.description })] }, `${result.section}-${i}`))) })) : null, _jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-muted", children: "Favorites" }), _jsx("div", { className: "flex flex-wrap gap-2", children: favorites.map((f) => _jsx("button", { type: "button", className: "rounded-full border px-3 py-1 text-xs", onClick: () => openSection(f), children: sectionsCatalog.find((s) => s.key === f)?.label ?? f }, f)) }), _jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-muted", children: "Recent" }), _jsx("div", { className: "space-y-1", children: recent.slice(0, 6).map((r) => _jsx("button", { type: "button", className: "block w-full text-left text-xs", onClick: () => openSection(r), children: sectionsCatalog.find((s) => s.key === r)?.label ?? r }, r)) }), _jsx("div", { className: "space-y-3", children: categoryOrder.map((category) => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-[11px] font-semibold uppercase tracking-wide text-muted", children: category }), (groupedSections.get(category) ?? []).map((section) => (_jsx("button", { type: "button", className: `block w-full rounded px-2 py-2 text-left text-sm ${selectedSection === section.key ? "bg-gold/10 text-gold" : ""}`, onClick: () => openSection(section.key), children: section.label }, section.key)))] }, category))) })] }), _jsxs("section", { className: "space-y-4 rounded-card border border-border bg-card p-5 shadow-card", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 border-b border-border pb-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl font-semibold", children: selectedSectionDef.label }), _jsx("p", { className: "text-sm text-muted", children: selectedSectionDef.description }), _jsxs("p", { className: "text-xs text-muted", children: ["Mode: ", selectedSectionDef.mode === "single" ? "Single configuration record" : "Multiple records"] })] }), _jsx("button", { type: "button", className: `h-9 rounded-btn border px-3 text-sm ${isFavorite ? "border-gold text-gold" : "border-border"}`, onClick: toggleFavorite, children: isFavorite ? "Remove Favorite" : "Add Favorite" })] }), selectedSectionDef.mode === "multiple" ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("div", { className: "text-sm text-muted", children: "Select a record to edit or create a new one." }), canManage ? _jsx("button", { type: "button", className: "h-9 rounded-btn border border-border px-3 text-sm", onClick: beginNewRecord, children: "New Record" }) : null] }), _jsx("div", { className: "grid gap-2 md:grid-cols-2 xl:grid-cols-3", children: sectionRecords.map((record) => (_jsxs("button", { type: "button", className: `rounded border px-3 py-2 text-left ${record.recordKey === selectedRecordKey ? "border-gold bg-gold/5" : "border-border"}`, onClick: () => beginEdit(record), children: [_jsx("div", { className: "font-medium", children: record.recordKey }), _jsx("div", { className: "text-xs text-muted", children: record.status })] }, record.id))) })] })) : null, _jsxs("div", { className: "space-y-3 rounded border border-border/70 bg-muted/10 p-4", children: [selectedSectionDef.mode === "multiple" ? (_jsxs("label", { className: "block text-xs text-muted", children: ["Record Key", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", value: draftRecordKey, onChange: (e) => setDraftRecordKey(e.target.value), disabled: !canManage })] })) : null, _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Status", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", value: draftStatus, onChange: (e) => setDraftStatus(e.target.value), disabled: !canManage, children: [_jsx("option", { value: "ACTIVE", children: "ACTIVE" }), _jsx("option", { value: "INACTIVE", children: "INACTIVE" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Sort Order", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", value: draftSortOrder, onChange: (e) => setDraftSortOrder(Number(e.target.value)), disabled: !canManage })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Effective From", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: draftEffectiveFrom, onChange: (e) => setDraftEffectiveFrom(e.target.value), disabled: !canManage })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Effective To", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: draftEffectiveTo, onChange: (e) => setDraftEffectiveTo(e.target.value), disabled: !canManage })] })] }), _jsxs("label", { className: "block text-xs text-muted", children: ["Configuration Payload (JSON)", _jsx("textarea", { className: "mt-1 min-h-[280px] w-full rounded border border-border bg-charcoal/95 px-3 py-2 font-mono text-xs text-white", value: draftJson, onChange: (e) => setDraftJson(e.target.value), disabled: !canManage })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [canManage && selectedSectionDef.mode === "multiple" && activeRecord ? _jsx("button", { type: "button", className: "h-10 rounded-btn border border-ruby/40 px-4 text-sm text-ruby", onClick: archiveRecord, children: "Archive" }) : null, canManage ? _jsx("button", { type: "button", className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: saveRecord, children: "Save" }) : _jsx("span", { className: "text-xs text-muted", children: "Read-only for your role" })] })] })] })] })] }));
};
