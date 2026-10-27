import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { invoiceFormSchema, type InvoiceFormInput } from "@jewelledger/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Tag, Trash2, Save, Send, Copy, Download, CreditCard, Check, AlertCircle, Eye, Camera, QrCode, Barcode } from "lucide-react";
import { useHardwareScanner } from "@/hooks/useHardwareScanner";
import { ScanCameraModal } from "@/components/inventory/ScanCameraModal";
import { playScanSuccessBeep, playScanIncrementBeep, playScanErrorBeep } from "@/utils/scanFeedback";
import { buildLineFromItem } from "@/utils/lineBuilder";
import { QuickCustomerModal } from "@/components/shared/QuickCustomerModal";
import { RecordPaymentModal } from "@/pages/invoices/RecordPaymentModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { downloadInvoicePdf } from "@/lib/downloadPdf";
import { taxService } from "@/services/taxService";
import { JournalPreviewModal } from "@/components/accounting/JournalPreviewModal";
import { customerService } from "@/services/customerService";
import { inventoryService } from "@/services/inventoryService";
import { useInvoiceCalc } from "@/hooks/useInvoiceCalc";
import { useProductServiceLookup } from "@/hooks/useProductServiceLookup";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";

const defaultLine: InvoiceFormInput["lines"][number] = {
  sku: "",
  description: "",
  karat: "22K",
  grossWt: 0,
  netWt: 0,
  stoneWt: 0,
  makingType: "PER_GRAM",
  makingRate: 0,
  ratePerGram: 0,
  discountPct: 0,
  gstPct: 3,
  hsnCode: "7113",
  huid: "",
};

const isLineFilled = (line: any): boolean => {
  if (!line) return false;
  const hasSku = typeof line.sku === "string" && line.sku.trim() !== "";
  const hasDesc = typeof line.description === "string" && line.description.trim() !== "";
  const hasGross = Number(line.grossWt) > 0;
  const hasNet = Number(line.netWt) > 0;
  const hasRate = Number(line.ratePerGram) > 0;
  const hasMaking = Number(line.makingRate) > 0;
  return Boolean(hasSku || hasDesc || hasGross || hasNet || hasRate || hasMaking);
};

const invoiceClientFormSchema = z.object({
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  customerId: z.coerce.number().min(1, "Customer is required"),
  salespersonId: z.coerce.number().optional().nullable(),
  placeOfSupply: z.string().min(1, "Place of supply is required"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  lines: z.array(
    z.object({
      sku: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      karat: z.enum(["24K", "22K", "18K", "14K", "SILVER", "PLATINUM"]).default("22K"),
      grossWt: z.coerce.number().nonnegative().default(0),
      netWt: z.coerce.number().nonnegative().default(0),
      stoneWt: z.coerce.number().nonnegative().default(0),
      makingType: z.enum(["PER_GRAM", "FLAT", "PERCENT", "FIXED"]).default("PER_GRAM"),
      makingRate: z.coerce.number().nonnegative().default(0),
      ratePerGram: z.coerce.number().nonnegative().default(0),
      discountPct: z.coerce.number().min(0).max(100).default(0),
      gstPct: z.coerce.number().min(0).max(28).default(3),
      hsnCode: z.string().default("7113"),
      huid: z.string().optional().nullable(),
    })
  ).superRefine((lines, ctx) => {
    const filledLines = lines.filter(isLineFilled);
    if (filledLines.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one line item is required",
        path: [0, "description"],
      });
      return;
    }
    lines.forEach((line, index) => {
      if (isLineFilled(line)) {
        if (!line.description || !line.description.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Description is required",
            path: [index, "description"],
          });
        }
      }
    });
  }),
});

export const InvoiceFormPage = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const [rates, setRates] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalInitialName, setCustomerModalInitialName] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormInput>({
    resolver: zodResolver(invoiceClientFormSchema),
    mode: "onChange",
    defaultValues: {
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      customerId: 0,
      salespersonId: null,
      placeOfSupply: "Gujarat",
      notes: "",
      terms: "",
      lines: [defaultLine],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const lineValues = useWatch({
    control,
    name: "lines",
  });
  const totals = useInvoiceCalc(lineValues || []);

  // ── QBO-Style Auto Add Row ──────────────────────────────────────────────
  // As soon as the last row is filled in (SKU, description, weight, or rate),
  // automatically append a clean new row so there is always a blank row ready.
  useEffect(() => {
    if (!lineValues || lineValues.length === 0) {
      append({ ...defaultLine });
      return;
    }
    const lastIndex = lineValues.length - 1;
    const lastLine = lineValues[lastIndex];
    if (isLineFilled(lastLine)) {
      append({ ...defaultLine });
    }
  }, [lineValues, append]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customerService.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items-list"],
    queryFn: () => inventoryService.listItems(),
  });

  // Products & Services master lookup for line item auto-fill
  const { productOptions, buildAutofill, searchProducts } = useProductServiceLookup("sales");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [flashingRowIndex, setFlashingRowIndex] = useState<number | null>(null);

  const handleScanCode = async (scannedCode: string) => {
    const raw = scannedCode.trim();
    if (!raw) return;

    try {
      const res = await inventoryService.resolveScan(raw);
      const { item, packQty = 1 } = res;

      const currentLines = (getValues("lines") || []) as any[];
      const existingIdx = currentLines.findIndex(
        (l: any) => l.sku && String(l.sku).toUpperCase() === String(item.sku).toUpperCase()
      );

      if (existingIdx >= 0) {
        // Line already exists: increment quantity / weight
        const cur = currentLines[existingIdx];
        const baseGross = Number(item.grossWt) || 1;
        const baseNet = Number(item.netWt) || 1;

        const nextNet = Number((Number(cur.netWt || 0) + baseNet * packQty).toFixed(3));
        const nextGross = Number((Number(cur.grossWt || 0) + baseGross * packQty).toFixed(3));

        setValue(`lines.${existingIdx}.netWt`, nextNet, { shouldValidate: true });
        setValue(`lines.${existingIdx}.grossWt`, nextGross, { shouldValidate: true });

        playScanIncrementBeep();
        setFlashingRowIndex(existingIdx);
        setTimeout(() => setFlashingRowIndex(null), 1200);

        toast.success(`Incremented "${item.name}" (Net: ${nextNet}g)`, {
          duration: 2000,
        });
      } else {
        // Line does not exist: build line item
        const newLine = buildLineFromItem(item, {
          metalRates: rates,
          defaultGstPct: 3,
        });

        const lastIdx = currentLines.length - 1;
        const lastLine = currentLines[lastIdx];
        const isLastEmpty = lastIdx >= 0 && !lastLine?.sku && (!lastLine?.grossWt || Number(lastLine?.grossWt) === 0);

        if (isLastEmpty) {
          setValue(`lines.${lastIdx}`, newLine, { shouldValidate: true });
          setFlashingRowIndex(lastIdx);
        } else {
          append(newLine);
          setFlashingRowIndex(currentLines.length);
        }

        playScanSuccessBeep();
        setTimeout(() => setFlashingRowIndex(null), 1200);
        toast.success(`Added "${item.name}" to invoice`, { duration: 2000 });
      }
    } catch (err: any) {
      playScanErrorBeep();
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message;

      if (code === "CROSS_COMPANY_SCAN") {
        toast.error("Cross-Company Security Notice: This barcode belongs to a different company or organization.", {
          duration: 5000,
        });
      } else {
        toast.error(message || `Item not found for code: "${raw}"`, {
          duration: 3000,
        });
      }
    }
  };

  useHardwareScanner({
    onScan: handleScanCode,
    enabled: true,
    onToggleScanMode: () => setCameraScanOpen((prev) => !prev),
  });

  const { data: nextNo } = useQuery({
    queryKey: ["invoice-next-number"],
    queryFn: invoiceService.getNextNumber,
  });

  const { data: existing, refetch: refetchExisting } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceService.getById(Number(id)),
    enabled: editing,
  });

  useEffect(() => {
    inventoryService.getTodayRates().then(setRates).catch(() => {});
  }, []);

  const customerOptions = customers.map((c: any) => ({
    value: c.id,
    label: c.name,
    meta: c.gstin ? `GST: ${c.gstin}` : c.mobile,
  }));

  // Unified list of jewellery inventory items and Products & Services
  const combinedItemOptions = useMemo(() => {
    const invMapped = (items || []).map((i: any) => ({
      value: String(i.sku),
      label: `${i.sku} – ${i.name}`,
      meta: `💍 ${i.karat || "22K"} | ${i.netWt || 0}g`,
      payload: { type: "INVENTORY", item: i },
    }));

    const psMapped = (productOptions || []).map((p: any) => ({
      value: String(p.payload?.code || p.value),
      label: p.label,
      meta: `📦 ${p.meta}`,
      payload: { type: "PRODUCT_SERVICE", item: p.payload },
    }));

    return [...invMapped, ...psMapped];
  }, [items, productOptions]);

  const loadCombinedItemOptions = async (query: string) => {
    const trimmed = query.trim().toLowerCase();
    const [invItems, psResults] = await Promise.all([
      inventoryService.listItems({ search: trimmed }).catch(() => []),
      searchProducts ? searchProducts(trimmed).catch(() => []) : Promise.resolve([]),
    ]);

    const invMapped = (invItems || []).map((i: any) => ({
      value: String(i.sku),
      label: `${i.sku} – ${i.name}`,
      meta: `💍 ${i.karat || "22K"} | ${i.netWt || 0}g`,
      payload: { type: "INVENTORY", item: i },
    }));

    const psMapped = (psResults || []).map((p: any) => ({
      value: String(p.payload?.code || p.value),
      label: p.label,
      meta: `📦 ${p.meta}`,
      payload: { type: "PRODUCT_SERVICE", item: p.payload },
    }));

    return [...invMapped, ...psMapped];
  };

  const saveAndCloseMutation = useMutation({
    mutationFn: async (payload: InvoiceFormInput) =>
      editing ? invoiceService.update(Number(id), payload) : invoiceService.create(payload),
    onSuccess: () => {
      toast.success(editing ? "Invoice saved successfully" : "Invoice created successfully");
      navigate("/invoices");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to save invoice");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: InvoiceFormInput) =>
      editing ? invoiceService.update(Number(id), payload) : invoiceService.create(payload),
    onSuccess: (record) => {
      toast.success(editing ? "Invoice saved & ledger updated" : "Invoice created & posted to ledger");
      if (!editing && record?.id) {
        navigate(`/invoices/${record.id}/edit`);
      } else {
        void refetchExisting();
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to save invoice");
    },
  });

  const saveAndNewMutation = useMutation({
    mutationFn: async (payload: InvoiceFormInput) =>
      editing ? invoiceService.update(Number(id), payload) : invoiceService.create(payload),
    onSuccess: () => {
      toast.success("Invoice created & posted to ledger");
      if (editing) {
        navigate("/invoices/new");
      } else {
        reset();
        void refetchExisting();
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to save invoice");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => invoiceService.duplicate(Number(id)),
    onSuccess: (record) => {
      toast.success("Invoice duplicated successfully");
      navigate(`/invoices/${record.id}/edit`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to duplicate invoice");
    },
  });

  const postMutation = useMutation({
    mutationFn: () => invoiceService.post(Number(id)),
    onSuccess: () => {
      toast.success("Invoice posted successfully");
      void refetchExisting();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to post invoice");
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => invoiceService.void(Number(id)),
    onSuccess: () => {
      toast.success("Invoice voided successfully");
      navigate("/invoices");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Unable to void invoice");
    },
  });

  const [downloadingPdf, setDownloadingPdf] = useState(false);


  useEffect(() => {
    if (!existing || !editing) return;
    const rawInvDate = existing.invoiceDate || existing.date;
    const invDate = rawInvDate ? new Date(rawInvDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const rawDue = existing.dueDate;
    const dueDate = rawDue ? new Date(rawDue).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    reset({
      invoiceDate: invDate,
      dueDate: dueDate,
      customerId: existing.customerId,
      salespersonId: existing.salespersonId ?? null,
      placeOfSupply: existing.placeOfSupply || "Gujarat",
      notes: existing.notes ?? "",
      terms: existing.terms ?? "",
      lines: (existing.lines && existing.lines.length > 0)
        ? existing.lines.map((l: any) => ({
            sku: l.sku || "",
            description: l.description || "",
            karat: l.karat || "22K",
            grossWt: Number(l.grossWt) || 0,
            netWt: Number(l.netWt) || 0,
            stoneWt: Number(l.stoneWt) || 0,
            makingType: l.makingType || "PER_GRAM",
            makingRate: Number(l.makingRate) || 0,
            ratePerGram: Number(l.ratePerGram) || 0,
            discountPct: Number(l.discountPct) || 0,
            gstPct: Number(l.gstPct) || 3,
            hsnCode: l.hsnCode || "7113",
            huid: l.huid || "",
          }))
        : [defaultLine],
    });
  }, [editing, existing, reset]);

  const onSelectUnifiedItem = (index: number, val: string, option?: any) => {
    const payload = option?.payload;
    const line = watch(`lines.${index}`);

    if (payload?.type === "INVENTORY") {
      const selectedItem = payload.item;
      setValue(`lines.${index}`, {
        ...line,
        sku: String(selectedItem.sku),
        description: selectedItem.name,
        karat: selectedItem.karat || "22K",
        grossWt: Number(selectedItem.grossWt) || 0,
        netWt: Number(selectedItem.netWt) || 0,
        stoneWt: Number(selectedItem.stoneWt) || 0,
        makingType: selectedItem.makingType || "PER_GRAM",
        makingRate: Number(selectedItem.makingRate) || 0,
        ratePerGram: rates ? (selectedItem.karat === "22K" ? rates.karat22 : rates.karat18) : (line.ratePerGram || 0),
      }, { shouldValidate: true });
      toast.success(`Selected jewellery: "${selectedItem.name}"`, { duration: 1500 });
      return;
    }

    if (payload?.type === "PRODUCT_SERVICE") {
      const p = payload.item;
      const autofill = buildAutofill(p);
      setValue(`lines.${index}`, {
        ...line,
        sku: String(p.code || val || "ITEM"),
        description: autofill.description,
        gstPct: autofill.gstPct,
        hsnCode: autofill.hsnCode || "7113",
        ...(p.type === "SERVICE" || line.ratePerGram === 0
          ? { ratePerGram: autofill.ratePerGram }
          : {}),
      }, { shouldValidate: true });
      toast.success(`Selected: "${autofill._productName}"`, { duration: 1500 });
      return;
    }

    const foundItem = items.find((i: any) => String(i.sku) === String(val));
    if (foundItem) {
      setValue(`lines.${index}`, {
        ...line,
        sku: String(foundItem.sku),
        description: foundItem.name,
        karat: foundItem.karat || "22K",
        grossWt: Number(foundItem.grossWt) || 0,
        netWt: Number(foundItem.netWt) || 0,
        stoneWt: Number(foundItem.stoneWt) || 0,
        makingType: foundItem.makingType || "PER_GRAM",
        makingRate: Number(foundItem.makingRate) || 0,
        ratePerGram: rates ? (foundItem.karat === "22K" ? rates.karat22 : rates.karat18) : (line.ratePerGram || 0),
      }, { shouldValidate: true });
    } else {
      setValue(`lines.${index}.sku`, String(val), { shouldValidate: true });
    }
  };

  const onAddNewCustomItem = (index: number, customText: string) => {
    const text = customText.trim();
    if (!text) return;
    const line = watch(`lines.${index}`);
    setValue(`lines.${index}`, {
      ...line,
      sku: text.toUpperCase().replace(/\s+/g, "-"),
      description: text,
    }, { shouldValidate: true });
    toast.success(`Added custom item "${text}"`, { duration: 1500 });
  };

  const onInvalid = (formErrors: any) => {
    console.error("Form Errors:", formErrors);
    const errorCount = Object.keys(formErrors).length;
    if (errorCount > 0) {
      toast.error(`Please correct ${errorCount} errors in the form.`);
      // Scroll to first error
      const firstErrorKey = Object.keys(formErrors)[0];
      const element = document.getElementsByName(firstErrorKey)[0];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }
  };

  const preparePayload = (values: any): InvoiceFormInput => {
    const filledLines = (values.lines || []).filter(isLineFilled).map((l: any) => ({
      ...l,
      sku: l.sku || null,
      description: l.description || "",
      karat: l.karat || "22K",
      grossWt: Number(l.grossWt) || 0,
      netWt: Number(l.netWt) || 0,
      stoneWt: Number(l.stoneWt) || 0,
      makingType: l.makingType || "PER_GRAM",
      makingRate: Number(l.makingRate) || 0,
      ratePerGram: Number(l.ratePerGram) || 0,
      discountPct: Number(l.discountPct) || 0,
      gstPct: Number(l.gstPct) || 3,
      hsnCode: l.hsnCode || "7113",
      huid: l.huid || null,
    }));

    return {
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      customerId: Number(values.customerId),
      salespersonId: values.salespersonId ? Number(values.salespersonId) : null,
      placeOfSupply: values.placeOfSupply || "Gujarat",
      notes: values.notes || "",
      terms: values.terms || "",
      lines: filledLines.length > 0 ? filledLines : values.lines,
    };
  };

  const onSaveAndClose = handleSubmit(async (values) => {
    const payload = preparePayload(values);
    await saveAndCloseMutation.mutateAsync(payload);
  }, onInvalid);

  const onSave = handleSubmit(async (values) => {
    const payload = preparePayload(values);
    await saveMutation.mutateAsync(payload);
  }, onInvalid);

  const onSaveAndNew = handleSubmit(async (values) => {
    const payload = preparePayload(values);
    await saveAndNewMutation.mutateAsync(payload);
  }, onInvalid);

  const handleDownloadPdf = handleSubmit(async (values) => {
    setDownloadingPdf(true);
    try {
      const payload = preparePayload(values);
      let targetId = id ? Number(id) : null;
      let targetNo = existing?.invoiceNo;

      if (!targetId) {
        const created = await saveMutation.mutateAsync(payload);
        if (created?.id) {
          targetId = created.id;
          targetNo = created.invoiceNo;
        }
      } else {
        await saveMutation.mutateAsync(payload);
      }
      if (targetId) {
        await downloadInvoicePdf(targetId, targetNo);
      }
    } finally {
      setDownloadingPdf(false);
    }
  }, onInvalid);

  const handlePrintPdf = handleSubmit(async (values) => {
    const payload = preparePayload(values);
    let targetId = id ? Number(id) : null;

    if (!targetId) {
      const created = await saveMutation.mutateAsync(payload);
      if (created?.id) {
        targetId = created.id;
      }
    } else {
      await saveMutation.mutateAsync(payload);
    }
    if (targetId) {
      window.open(`/invoices/${targetId}/print?autoprint=1`, "_blank", "noopener,noreferrer");
    }
  }, onInvalid);

  const busy =
    saveAndCloseMutation.isPending ||
    saveMutation.isPending ||
    saveAndNewMutation.isPending ||
    duplicateMutation.isPending ||
    postMutation.isPending ||
    voidMutation.isPending ||
    isSubmitting;

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{editing ? "Edit Invoice" : "New Sales Invoice"}</span>
            {existing?.status && <StatusBadge status={existing.status} />}
          </div>
        }
        subtitle={
          editing
            ? `Invoice No: ${existing?.invoiceNo ?? "..."}${
                existing?.customer?.name ? ` · Customer: ${existing.customer.name}` : ""
              }${
                existing?.balanceDue !== undefined
                  ? ` · Balance Due: ${formatCurrency(existing.balanceDue)}`
                  : ""
              }`
            : `Invoice No: ${nextNo?.invoiceNo ?? "..."}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrintPdf}
              type="button"
              title="Print Invoice"
              className="gap-1.5 border-border hover:border-gold hover:text-gold"
            >
              <Printer className="h-4 w-4 text-muted" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
              type="button"
              title="Download PDF"
              className="gap-1.5 border-border hover:border-gold hover:text-gold"
            >
              <Download className={`h-4 w-4 text-muted ${downloadingPdf ? "animate-bounce" : ""}`} />
              PDF
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            <Button
              variant="outline"
              loading={saveMutation.isPending}
              onClick={() => onSave()}
              type="button"
              data-shortcut="save"
              title="Save (Ctrl+S)"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>

            <Button
              variant="outline"
              loading={saveAndNewMutation.isPending}
              onClick={() => onSaveAndNew()}
              type="button"
              data-shortcut="save-new"
              title="Save and New (Ctrl+Enter)"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Save & New
            </Button>

            <Button
              className="bg-gold hover:bg-gold-light text-white font-semibold shadow-sm"
              loading={saveAndCloseMutation.isPending}
              onClick={() => onSaveAndClose()}
              type="button"
              data-shortcut="save-close"
              title="Save and Close (Shift+Ctrl+Enter)"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Save & Close
            </Button>
          </div>
        }
      />

      <form className="space-y-4" onSubmit={onSaveAndClose} noValidate>
        <div className="grid gap-6 rounded-card border-t-2 border-t-gold bg-card p-8 shadow-card md:grid-cols-4">
          <Input
            label="Invoice Date"
            type="date"
            required
            error={errors.invoiceDate?.message}
            {...register("invoiceDate")}
          />
          <Input
            label="Due Date"
            type="date"
            required
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />
          <div className="md:col-span-2">
            <p className="mb-1 text-xs font-medium text-muted">
              Customer <span className="ml-1 text-ruby font-bold">*</span>
            </p>
            <input type="hidden" {...register("customerId", { valueAsNumber: true })} />
            <SearchableSelect
              loadOptions={async (query) => {
                const data = await customerService.list({ search: query });
                return data.map((c: any) => ({
                  value: String(c.id),
                  label: c.name,
                  meta: c.gstin ? `GST: ${c.gstin}` : c.mobile,
                }));
              }}
              onChange={(value) => {
                setValue("customerId", Number(value), { shouldValidate: true });
                clearErrors("customerId");
              }}
              options={customerOptions.map((o: any) => ({ ...o, value: String(o.value) }))}
              value={String(watch("customerId") || "")}
              placeholder="Select or search customer..."
              onAddNew={(query) => {
                setCustomerModalInitialName(query);
                setIsCustomerModalOpen(true);
              }}
              addNewLabel="Create customer"
            />
            {errors.customerId && (
              <p className="mt-1 text-xs text-ruby animate-in fade-in slide-in-from-top-1">
                Please select a valid customer
              </p>
            )}
          </div>
          <Input
            label="Place of Supply"
            required
            error={errors.placeOfSupply?.message}
            {...register("placeOfSupply")}
          />
          <TextArea
            label="Internal Notes"
            containerClassName="md:col-span-3"
            placeholder="Add any internal notes here..."
            {...register("notes")}
          />
        </div>

        <div className="rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-2">
            <div>
              <h2 className="font-display text-2xl font-semibold text-charcoal">Line Items</h2>
              <p className="text-xs text-muted">Add products or services to this invoice, or scan barcode / QR tags</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCameraScanOpen(true)}
                type="button"
                className="gap-1.5 border-gold/40 bg-gold/5 text-gold hover:bg-gold/15"
                title="Scan with Camera (Ctrl+Shift+B)"
              >
                <Camera className="h-4 w-4" />
                Scan Barcode / QR
              </Button>
              <Button variant="outline" size="sm" onClick={() => append({ ...defaultLine })} type="button">
                <Plus className="mr-1.5 h-4 w-4" /> Add Row
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2 px-3 pb-2 text-[10px] font-bold text-muted md:grid-cols-12 uppercase tracking-widest border-b border-border">
              <div className="md:col-span-2">Product / SKU</div>
              <div className="md:col-span-1">Karat</div>
              <div className="md:col-span-1 text-right">Gross (g)</div>
              <div className="md:col-span-1 text-right">Net (g)</div>
              <div className="md:col-span-2 text-right">Rate / g</div>
              <div className="md:col-span-1 text-right">Making</div>
              <div className="md:col-span-1 text-right">Disc%</div>
              <div className="md:col-span-1 text-right">GST%</div>
              <div className="md:col-span-1 text-right pr-4">Total</div>
              <div className="md:col-span-1 text-center"></div>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`group grid gap-3 rounded-lg border p-3 md:grid-cols-12 items-start transition-all duration-300 ${
                  flashingRowIndex === index
                    ? "border-gold bg-gold/15 ring-2 ring-gold/40 shadow-md"
                    : "border-border hover:border-gold/30 hover:bg-gold-tint/10"
                }`}
              >
                <div className="md:col-span-2 space-y-1.5">
                  <input type="hidden" {...register(`lines.${index}.stoneWt`, { valueAsNumber: true })} />
                  <input type="hidden" {...register(`lines.${index}.makingType`)} />
                  <input type="hidden" {...register(`lines.${index}.hsnCode`)} />
                  <input type="hidden" {...register(`lines.${index}.huid`)} />
                  
                  {/* Single Unified Product / SKU Picker */}
                  <SearchableSelect
                    loadOptions={loadCombinedItemOptions}
                    options={combinedItemOptions}
                    placeholder="Search SKU or Product/Service..."
                    value={String(watch(`lines.${index}.sku`) || "")}
                    onChange={(val, option) => onSelectUnifiedItem(index, String(val), option)}
                    onAddNew={(customText) => onAddNewCustomItem(index, customText)}
                    addNewLabel="Use custom item"
                    error={errors.lines?.[index]?.sku?.message}
                  />

                  <input
                    className="w-full bg-transparent text-[11px] text-muted focus:text-charcoal focus:outline-none border-b border-transparent focus:border-gold transition-colors px-1"
                    placeholder="Short description..."
                    {...register(`lines.${index}.description`)}
                  />
                </div>

                <div className="md:col-span-1">
                  <select
                    className="h-9 w-full rounded border border-border bg-white px-1 text-xs focus:border-gold focus:ring-gold"
                    {...register(`lines.${index}.karat`)}
                  >
                    <option value="24K">24K</option>
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                    <option value="14K">14K</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.001"
                    {...register(`lines.${index}.grossWt`, { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-1">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.001"
                    {...register(`lines.${index}.netWt`, { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-2">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs font-mono focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.01"
                    {...register(`lines.${index}.ratePerGram`, { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-1">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.01"
                    {...register(`lines.${index}.makingRate`, { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-1">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.01"
                    {...register(`lines.${index}.discountPct`, { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-1">
                  <input
                    className="h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold"
                    type="number"
                    step="0.01"
                    {...register(`lines.${index}.gstPct`, { valueAsNumber: true })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        if (index === fields.length - 1) {
                          e.preventDefault();
                          append({ ...defaultLine });
                        }
                      }
                    }}
                  />
                </div>

                <div className="h-9 flex items-center justify-end px-3 text-xs font-mono font-bold text-charcoal md:col-span-1 bg-canvas rounded border border-border">
                  {formatCurrency(totals.lineTotals[index]?.total ?? 0)}
                </div>

                <div className="md:col-span-1 flex items-center justify-center gap-1">
                  <button
                    className="grid h-7 w-7 place-items-center rounded border border-border text-muted hover:border-gold hover:bg-gold-tint/20 hover:text-gold transition-all"
                    onClick={() => {
                      const cur = watch(`lines.${index}`);
                      append({ ...cur });
                      toast.info(`Duplicated row ${index + 1}`);
                    }}
                    type="button"
                    title="Duplicate item (Ctrl+D)"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    className="grid h-7 w-7 place-items-center rounded border border-border text-muted hover:border-ruby hover:bg-ruby hover:text-white transition-all"
                    onClick={() => remove(index)}
                    type="button"
                    title="Remove item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Inline Errors for the line */}
                {(errors.lines?.[index] as any) && (
                  <div className="md:col-span-12 px-2 pb-1">
                    <p className="text-[10px] text-ruby italic">
                      {Object.values(errors.lines?.[index] || {})
                        .map((err: any) => err?.message)
                        .filter(Boolean)
                        .join(", ") || "Invalid data in this row. Please check weights and rates."}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {fields.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 bg-canvas/30 rounded-lg border-2 border-dashed border-border">
                <p className="text-sm text-muted">No line items added yet.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-gold" onClick={() => append({ ...defaultLine })}>
                  <Plus className="mr-1 h-3 w-3" /> Add your first item
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-card border border-border bg-card p-6 shadow-sm">
            <TextArea
              label="Terms and Conditions"
              placeholder="Specify payment terms, return policy, etc."
              rows={4}
              {...register("terms")}
            />
          </div>

          <div className="rounded-card border-t-4 border-t-gold bg-charcoal p-8 text-white shadow-card">
            <h3 className="mb-6 font-display text-xl font-medium text-gold-light">Summary</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/60">Sub Total</span>
                <span className="font-mono font-medium">{formatCurrency(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-ruby-light">
                <span className="text-white/60">Discount</span>
                <span className="font-mono">-{formatCurrency(totals.discount)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/60">Taxable Amount</span>
                <span className="font-mono">{formatCurrency(totals.taxableAmount)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/60">GST Breakdown</span>
                <span className="font-mono">{formatCurrency(totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-lg font-bold text-gold-light">Grand Total</span>
                <span className="font-mono text-2xl font-bold text-gold">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Bottom Actions (Print, PDF, Save) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrintPdf}
              type="button"
              title="Print Invoice"
              className="gap-1.5 border-border hover:border-gold hover:text-gold"
            >
              <Printer className="h-4 w-4 text-muted" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
              type="button"
              title="Download PDF"
              className="gap-1.5 border-border hover:border-gold hover:text-gold"
            >
              <Download className={`h-4 w-4 text-muted ${downloadingPdf ? "animate-bounce" : ""}`} />
              PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              loading={saveMutation.isPending}
              onClick={() => onSave()}
              type="button"
              title="Save (Ctrl+S)"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>

            <Button
              variant="outline"
              loading={saveAndNewMutation.isPending}
              onClick={() => onSaveAndNew()}
              type="button"
              title="Save and New (Ctrl+Enter)"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Save & New
            </Button>

            <Button
              className="bg-gold hover:bg-gold-light text-white font-semibold shadow-sm"
              loading={saveAndCloseMutation.isPending}
              onClick={() => onSaveAndClose()}
              type="button"
              title="Save and Close (Shift+Ctrl+Enter)"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Save & Close
            </Button>
          </div>
        </div>
      </form>

      {/* Payment History if payments exist */}
      {editing && existing?.payments && existing.payments.length > 0 && (
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">Payment History</h3>
            <span className="font-mono text-xs font-semibold text-emerald-600">
              Total Paid: {formatCurrency(existing.paidAmount || 0)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gold/5 text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {existing.payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-4 py-2 text-xs">{new Date(p.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-2 text-xs">{p.mode}</td>
                    <td className="px-4 py-2 text-xs text-muted">{p.reference || "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Journal Preview Modal */}
      <JournalPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentType="Tax Invoice"
        documentNo={existing?.invoiceNo || "DRAFT-INV"}
        posDescription={previewData?.posResult?.description}
        supplyType={previewData?.posResult?.supplyType}
        lines={previewData?.journalPreview || []}
        taxSummary={previewData?.taxSummary}
      />

      {/* Record Payment Modal */}
      {editing && existing && (
        <RecordPaymentModal
          open={paymentOpen}
          invoiceId={Number(id)}
          invoiceNo={existing.invoiceNo}
          balanceDue={Number(existing.balanceDue || 0)}
          onClose={() => setPaymentOpen(false)}
          onSaved={() => {
            void refetchExisting();
          }}
        />
      )}

      {isCustomerModalOpen && (
        <QuickCustomerModal
          initialName={customerModalInitialName}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={(newCustomer) => {
            // Update react-hook-form value
            setValue("customerId", Number(newCustomer.id), { shouldValidate: true });
            clearErrors("customerId");
            
            // Re-fetch customer list to ensure the new one is available in the dropdown
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            
            setIsCustomerModalOpen(false);
          }}
        />
      )}

      {/* Camera Barcode / QR Scanner Modal */}
      <ScanCameraModal
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onScan={handleScanCode}
      />
    </div>
  );
};
