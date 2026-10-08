import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

type SectionCategory =
  | "Core"
  | "Accounting"
  | "Tax"
  | "Sales"
  | "Purchases"
  | "Governance"
  | "Platform"
  | "Data"
  | "Enterprise";

type SectionMode = "single" | "multiple";

type Section = {
  key: string;
  label: string;
  category: SectionCategory;
  mode: SectionMode;
  description: string;
  tags: string[];
};

type RecordStatus = "ACTIVE" | "INACTIVE";

type SettingsRecord = {
  id: string;
  recordKey: string;
  payload: Record<string, unknown>;
  status: RecordStatus;
  sortOrder: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

const sectionsCatalog: Section[] = [
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

const categoryOrder: SectionCategory[] = [
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

const slugifyKey = (raw: string) =>
  raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default";

const toJsonString = (value: unknown) => JSON.stringify(value, null, 2);

const parsePayload = (json: string) => {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true as const, data: parsed as Record<string, unknown> };
    }
    return { ok: false as const, error: "Payload must be a JSON object." };
  } catch {
    return { ok: false as const, error: "Invalid JSON format." };
  }
};

const defaultRecord = (section: Section): SettingsRecord => ({
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

type LocalStore = {
  favorites: string[];
  recent: string[];
  recordsBySection: Record<string, SettingsRecord[]>;
};

const readStore = (companyId: string | null): LocalStore => {
  const key = `settings-center-local:${companyId ?? "default"}`;
  const raw = localStorage.getItem(key);
  if (!raw) return { favorites: [], recent: [], recordsBySection: {} };
  try {
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      recordsBySection: parsed.recordsBySection ?? {},
    };
  } catch {
    return { favorites: [], recent: [], recordsBySection: {} };
  }
};

const writeStore = (companyId: string | null, store: LocalStore) => {
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
  const [favorites, setFavorites] = useState<string[]>(initialStore.favorites);
  const [recent, setRecent] = useState<string[]>(initialStore.recent);
  const [recordsBySection, setRecordsBySection] = useState<Record<string, SettingsRecord[]>>(initialStore.recordsBySection);
  const [selectedSection, setSelectedSection] = useState<string>(sectionsCatalog[0].key);
  const [selectedRecordKey, setSelectedRecordKey] = useState<string>("default");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [draftRecordKey, setDraftRecordKey] = useState<string>("default");
  const [draftStatus, setDraftStatus] = useState<RecordStatus>("ACTIVE");
  const [draftSortOrder, setDraftSortOrder] = useState<number>(0);
  const [draftEffectiveFrom, setDraftEffectiveFrom] = useState<string>("");
  const [draftEffectiveTo, setDraftEffectiveTo] = useState<string>("");
  const [draftJson, setDraftJson] = useState<string>("{}");

  const persist = (next: Partial<LocalStore>) => {
    const merged: LocalStore = {
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
    const groups = new Map<SectionCategory, Section[]>();
    sectionsCatalog.forEach((section) => {
      const current = groups.get(section.category) ?? [];
      current.push(section);
      groups.set(section.category, current);
    });
    return groups;
  }, []);

  const touchRecent = (sectionKey: string) => {
    const nextRecent = [sectionKey, ...recent.filter((item) => item !== sectionKey)].slice(0, 20);
    setRecent(nextRecent);
    persist({ recent: nextRecent });
  };

  const openSection = (sectionKey: string) => {
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

  const beginEdit = (record: SettingsRecord) => {
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
    if (!canManage) return;
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
    const updated: SettingsRecord = {
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
    if (!canManage || selectedSectionDef.mode !== "multiple" || !activeRecord) return;
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
    if (q.length < 2) return [];
    const bySection = sectionsCatalog
      .filter((section) =>
        section.label.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q) ||
        section.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
      .map((section) => ({ type: "section" as const, section: section.key, label: section.label, description: section.description }));
    return bySection.slice(0, 10);
  }, [searchTerm]);

  const isFavorite = favorites.includes(selectedSection);

  return (
    <div className="space-y-4">
      <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Running in local mode because settings-center API endpoints are unavailable (prevents 404 errors).
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-card border border-border bg-card p-4 shadow-card">
          <label className="text-xs font-medium text-muted">Search all settings</label>
          <input className="h-10 w-full rounded border border-border px-3 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm.trim().length >= 2 ? (
            <div className="space-y-2 rounded border border-border/70 bg-muted/10 p-3">
              {searchResults.map((result, i) => (
                <button key={`${result.section}-${i}`} type="button" className="block w-full text-left text-xs" onClick={() => { openSection(result.section); setSearchTerm(""); }}>
                  <div className="font-medium">{result.label}</div>
                  <div className="text-muted">{result.description}</div>
                </button>
              ))}
            </div>
          ) : null}
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Favorites</div>
          <div className="flex flex-wrap gap-2">{favorites.map((f) => <button key={f} type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => openSection(f)}>{sectionsCatalog.find((s) => s.key === f)?.label ?? f}</button>)}</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Recent</div>
          <div className="space-y-1">{recent.slice(0, 6).map((r) => <button key={r} type="button" className="block w-full text-left text-xs" onClick={() => openSection(r)}>{sectionsCatalog.find((s) => s.key === r)?.label ?? r}</button>)}</div>
          <div className="space-y-3">
            {categoryOrder.map((category) => (
              <div key={category} className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{category}</div>
                {(groupedSections.get(category) ?? []).map((section) => (
                  <button key={section.key} type="button" className={`block w-full rounded px-2 py-2 text-left text-sm ${selectedSection === section.key ? "bg-gold/10 text-gold" : ""}`} onClick={() => openSection(section.key)}>
                    {section.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <section className="space-y-4 rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">{selectedSectionDef.label}</h2>
              <p className="text-sm text-muted">{selectedSectionDef.description}</p>
              <p className="text-xs text-muted">Mode: {selectedSectionDef.mode === "single" ? "Single configuration record" : "Multiple records"}</p>
            </div>
            <button type="button" className={`h-9 rounded-btn border px-3 text-sm ${isFavorite ? "border-gold text-gold" : "border-border"}`} onClick={toggleFavorite}>
              {isFavorite ? "Remove Favorite" : "Add Favorite"}
            </button>
          </div>
          {selectedSectionDef.mode === "multiple" ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="text-sm text-muted">Select a record to edit or create a new one.</div>
                {canManage ? <button type="button" className="h-9 rounded-btn border border-border px-3 text-sm" onClick={beginNewRecord}>New Record</button> : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {sectionRecords.map((record) => (
                  <button key={record.id} type="button" className={`rounded border px-3 py-2 text-left ${record.recordKey === selectedRecordKey ? "border-gold bg-gold/5" : "border-border"}`} onClick={() => beginEdit(record)}>
                    <div className="font-medium">{record.recordKey}</div>
                    <div className="text-xs text-muted">{record.status}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-3 rounded border border-border/70 bg-muted/10 p-4">
            {selectedSectionDef.mode === "multiple" ? (
              <label className="block text-xs text-muted">Record Key<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" value={draftRecordKey} onChange={(e) => setDraftRecordKey(e.target.value)} disabled={!canManage} /></label>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-muted">Status<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as RecordStatus)} disabled={!canManage}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
              <label className="text-xs text-muted">Sort Order<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" value={draftSortOrder} onChange={(e) => setDraftSortOrder(Number(e.target.value))} disabled={!canManage} /></label>
              <label className="text-xs text-muted">Effective From<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" value={draftEffectiveFrom} onChange={(e) => setDraftEffectiveFrom(e.target.value)} disabled={!canManage} /></label>
              <label className="text-xs text-muted">Effective To<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" value={draftEffectiveTo} onChange={(e) => setDraftEffectiveTo(e.target.value)} disabled={!canManage} /></label>
            </div>
            <label className="block text-xs text-muted">Configuration Payload (JSON)<textarea className="mt-1 min-h-[280px] w-full rounded border border-border bg-charcoal/95 px-3 py-2 font-mono text-xs text-white" value={draftJson} onChange={(e) => setDraftJson(e.target.value)} disabled={!canManage} /></label>
            <div className="flex justify-end gap-2">
              {canManage && selectedSectionDef.mode === "multiple" && activeRecord ? <button type="button" className="h-10 rounded-btn border border-ruby/40 px-4 text-sm text-ruby" onClick={archiveRecord}>Archive</button> : null}
              {canManage ? <button type="button" className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={saveRecord}>Save</button> : <span className="text-xs text-muted">Read-only for your role</span>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

