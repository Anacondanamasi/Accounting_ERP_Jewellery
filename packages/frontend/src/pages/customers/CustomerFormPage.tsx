import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@jewelledger/shared";
import { toast } from "sonner";
import { ArrowLeft, Save, Building2, User, Ban, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { customerService } from "@/services/customerService";
import { taxService } from "@/services/taxService";

export const CustomerFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [activeTab, setActiveTab] = useState("other");
  const [customerStatus, setCustomerStatus] = useState<string>("ACTIVE");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [validatingGstin, setValidatingGstin] = useState(false);
  const [gstinInfo, setGstinInfo] = useState<{
    valid: boolean;
    stateName?: string;
    stateCode?: string;
    pan?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: {
      type: "BUSINESS",
      currency: "INR",
      openingBalance: 0,
      creditLimit: 0,
      creditDays: 0,
      billingAddress: { country: "India" },
      shippingAddress: { country: "India" },
    },
  });

  useEffect(() => {
    if (isEditing) {
      const fetchCustomer = async () => {
        try {
          const { data } = await api.get(`/customers/${id}`);
          if (data.success) {
            reset(data.data);
            setCustomerStatus(data.data.status || "ACTIVE");
          }
        } catch (error) {
          toast.error("Failed to fetch customer data");
        }
      };
      fetchCustomer();
    }
  }, [id, isEditing, reset]);

  const handleDeactivate = async () => {
    if (!window.confirm("Are you sure you want to deactivate this customer?")) return;
    try {
      setIsDeactivating(true);
      await customerService.remove(Number(id));
      setCustomerStatus("INACTIVE");
      toast.success("Customer deactivated successfully");
      navigate("/customers");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to deactivate customer");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleActivate = async () => {
    try {
      setIsDeactivating(true);
      await customerService.update(Number(id), { status: "ACTIVE" });
      setCustomerStatus("ACTIVE");
      toast.success("Customer activated successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to activate customer");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleVerifyAndPrefillGstin = async (inputGstin?: string) => {
    const raw = (inputGstin || watch("gstin") || "").trim().toUpperCase();
    if (!raw || raw.length !== 15) {
      toast.error("Please enter a 15-character GSTIN to prefill");
      return;
    }
    setValidatingGstin(true);
    try {
      const res = await taxService.validateGstin(raw);
      if (res.valid) {
        setGstinInfo({ valid: true, stateName: res.stateName, stateCode: res.stateCode, pan: res.pan });
        if (res.pan) setValue("pan", res.pan, { shouldDirty: true });
        if (res.stateName) {
          setValue("billingAddress.state" as any, res.stateName, { shouldDirty: true });
          setValue("shippingAddress.state" as any, res.stateName, { shouldDirty: true });
        }
        toast.success(`GSTIN valid for ${res.stateName}. PAN (${res.pan}) & State auto-filled.`);
      } else {
        setGstinInfo({ valid: false });
        toast.error(res.error || "Invalid GSTIN checksum");
      }
    } catch {
      toast.error("GSTIN verification failed");
    } finally {
      setValidatingGstin(false);
    }
  };

  const customerType = watch("type");

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEditing) {
        await api.put(`/customers/${id}`, data);
        toast.success("Customer updated successfully");
      } else {
        await api.post("/customers", data);
        toast.success("Customer created successfully");
      }
      navigate("/customers");
    } catch (error: any) {
      toast.error(error.userMessage || "Failed to save customer");
    }
  });

  const tabs = [
    { id: "other", label: "Other Details" },
    { id: "address", label: "Address" },
    { id: "contact", label: "Contact Persons" },
    { id: "custom", label: "Custom Fields" },
    { id: "remarks", label: "Remarks" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/customers")}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-canvas transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-charcoal">
              {isEditing ? "Edit Customer" : "New Customer"}
            </h1>
            {isEditing && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  customerStatus === "ACTIVE"
                    ? "bg-emerald/10 text-emerald border border-emerald/20"
                    : "bg-slate-200 text-slate-600 border border-slate-300"
                }`}
              >
                {customerStatus}
              </span>
            )}
          </div>
        </div>
        {isEditing && (
          <div>
            {customerStatus === "ACTIVE" ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ruby/40 text-ruby px-4 text-xs font-medium hover:bg-ruby/5 transition-colors"
              >
                <Ban className="h-3.5 w-3.5" />
                {isDeactivating ? "Deactivating…" : "Deactivate Customer"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                disabled={isDeactivating}
                className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-emerald/40 text-emerald px-4 text-xs font-medium hover:bg-emerald/5 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isDeactivating ? "Activating…" : "Activate Customer"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-canvas p-6">
        <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-8" noValidate>
          
          {/* GST Alert */}
          <div className="rounded-md border border-sapphire/20 bg-sapphire/5 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-sapphire" />
              <p className="text-sm text-sapphire-dark">
                Prefill & validate Customer details from GSTIN (State jurisdiction, PAN, and POS).
              </p>
            </div>
            <button
              type="button"
              disabled={validatingGstin}
              onClick={() => {
                const g = watch("gstin");
                if (!g) {
                  const promptVal = window.prompt("Enter 15-character GSTIN to prefill:");
                  if (promptVal) {
                    setValue("gstin", promptVal.toUpperCase(), { shouldDirty: true });
                    handleVerifyAndPrefillGstin(promptVal);
                  }
                } else {
                  handleVerifyAndPrefillGstin(g);
                }
              }}
              className="text-xs font-semibold text-sapphire hover:underline bg-white px-3 py-1.5 rounded border border-sapphire/30 shadow-sm"
            >
              {validatingGstin ? "Verifying..." : "Prefill from GSTIN >"}
            </button>
          </div>

          {/* Core Info */}
          <div className="rounded-card border border-border bg-card p-6 shadow-sm space-y-6">
            
            {/* Customer Type */}
            <div className="flex items-center gap-8">
              <span className="w-48 text-sm font-medium text-muted">Customer Type</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="BUSINESS"
                    className="h-4 w-4 text-gold focus:ring-gold"
                    {...register("type")}
                  />
                  <span className="text-sm">Business</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="INDIVIDUAL"
                    className="h-4 w-4 text-gold focus:ring-gold"
                    {...register("type")}
                  />
                  <span className="text-sm">Individual</span>
                </label>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="flex items-start gap-8">
              <span className="w-48 text-sm font-medium text-muted pt-2">Primary Contact</span>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <Select
                  options={[
                    { value: "Mr.", label: "Mr." },
                    { value: "Mrs.", label: "Mrs." },
                    { value: "Ms.", label: "Ms." },
                    { value: "Dr.", label: "Dr." },
                  ]}
                  placeholder="Salutation"
                />
                <div className="col-span-2">
                  <Input placeholder="Full Name" {...register("name")} error={errors.name?.message} />
                </div>
              </div>
            </div>

            {/* Company Name */}
            {customerType === "BUSINESS" && (
              <div className="flex items-center gap-8">
                <span className="w-48 text-sm font-medium text-muted">Company Name</span>
                <div className="flex-1">
                  <Input placeholder="Company Name" {...register("companyName")} />
                </div>
              </div>
            )}

            {/* Display Name */}
            <div className="flex items-center gap-8">
              <span className="w-48 text-sm font-medium text-muted flex items-center gap-1">
                Display Name <span className="text-ruby">*</span>
              </span>
              <div className="flex-1">
                <Input placeholder="Display Name (Required)" {...register("name")} error={errors.name?.message} />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex items-center gap-8">
              <span className="w-48 text-sm font-medium text-muted">Email Address</span>
              <div className="flex-1">
                <Input type="email" placeholder="Email" {...register("email")} error={errors.email?.message} />
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-8">
              <span className="w-48 text-sm font-medium text-muted pt-2">Phone</span>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <Input placeholder="Work Phone" {...register("workPhone")} />
                <Input placeholder="Mobile" {...register("mobile")} />
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="rounded-card border border-border bg-card shadow-sm">
            {/* Tab Headers */}
            <div className="flex overflow-x-auto border-b border-border px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-b-2 border-gold text-charcoal"
                      : "text-muted hover:text-charcoal"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "other" && (
                <div className="space-y-6 max-w-2xl">
                  {customerType === "BUSINESS" && (
                    <div className="flex items-center gap-8">
                      <span className="w-48 text-sm font-medium text-muted">GSTIN</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. 24AAACM1234A1Z1"
                            maxLength={15}
                            {...register("gstin")}
                          />
                          <button
                            type="button"
                            disabled={validatingGstin}
                            onClick={() => handleVerifyAndPrefillGstin()}
                            className="shrink-0 rounded border border-border bg-slate-50 px-3 text-xs font-semibold text-charcoal hover:bg-slate-100"
                          >
                            Verify
                          </button>
                        </div>
                        {gstinInfo?.valid && (
                          <p className="text-[11px] font-medium text-emerald">
                            Verified: {gstinInfo.stateName} ({gstinInfo.stateCode}) · PAN {gstinInfo.pan}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">PAN</span>
                    <div className="flex-1">
                      <Input placeholder="PAN" {...register("pan")} />
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">Currency</span>
                    <div className="flex-1">
                      <Select
                        options={[{ value: "INR", label: "INR - Indian Rupee" }]}
                        value="INR"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">Credit Limit</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...register("creditLimit")}
                        error={errors.creditLimit?.message}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">Credit Days</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0"
                        {...register("creditDays")}
                        error={errors.creditDays?.message}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">Opening Balance</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...register("openingBalance")}
                        error={errors.openingBalance?.message}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="w-48 text-sm font-medium text-muted">Payment Terms</span>
                    <div className="flex-1">
                      <Select
                        options={[
                          { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
                          { value: "NET_15", label: "Net 15" },
                          { value: "NET_30", label: "Net 30" },
                        ]}
                        placeholder="Select Payment Terms"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "address" && (
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h3 className="font-medium text-charcoal">Billing Address</h3>
                    <Input placeholder="Street 1" {...register("billingAddress.street")} />
                    <Input placeholder="City" {...register("billingAddress.city")} />
                    <Input placeholder="State" {...register("billingAddress.state")} />
                    <Input placeholder="Zip Code" {...register("billingAddress.zip")} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium text-charcoal">Shipping Address</h3>
                    <Input placeholder="Street 1" {...register("shippingAddress.street")} />
                    <Input placeholder="City" {...register("shippingAddress.city")} />
                    <Input placeholder="State" {...register("shippingAddress.state")} />
                    <Input placeholder="Zip Code" {...register("shippingAddress.zip")} />
                  </div>
                </div>
              )}

              {activeTab === "remarks" && (
                <div className="space-y-4">
                  <textarea
                    className="w-full h-32 rounded-md border border-border p-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                    placeholder="Add internal remarks about this customer..."
                    {...register("notes")}
                  />
                </div>
              )}

              {(activeTab === "contact" || activeTab === "custom") && (
                <div className="py-8 text-center text-sm text-muted">
                  Coming soon...
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 pb-12">
            <div className="flex items-center gap-4">
              <Button type="submit" loading={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                Save Customer
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>
                Cancel
              </Button>
            </div>
            {isEditing && customerStatus === "ACTIVE" && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                {isDeactivating ? "Deactivating…" : "Deactivate Customer"}
              </Button>
            )}
            {isEditing && customerStatus === "INACTIVE" && (
              <Button
                type="button"
                className="border-emerald/40 text-emerald hover:bg-emerald/5"
                variant="outline"
                onClick={handleActivate}
                disabled={isDeactivating}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {isDeactivating ? "Activating…" : "Activate Customer"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
