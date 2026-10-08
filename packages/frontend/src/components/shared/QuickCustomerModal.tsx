import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@jewelledger/shared";
import { toast } from "sonner";
import { X, Save, User, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/axios";

interface QuickCustomerModalProps {
  initialName?: string;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

export const QuickCustomerModal = ({ initialName = "", onClose, onSuccess }: QuickCustomerModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: {
      type: "BUSINESS",
      name: initialName,
      companyName: initialName,
      currency: "INR",
      openingBalance: 0,
      creditLimit: 0,
      creditDays: 0,
      billingAddress: { country: "India" },
      shippingAddress: { country: "India" },
    },
  });

  const customerType = watch("type");

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await api.post("/customers", data);
      toast.success("Customer created successfully");
      onSuccess(response.data.data);
    } catch (error: any) {
      toast.error(error.userMessage || "Failed to create customer");
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-xl bg-card shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/10">
          <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
            {customerType === "BUSINESS" ? <Building2 className="h-5 w-5 text-gold" /> : <User className="h-5 w-5 text-gold" />}
            Quick Create Customer
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded text-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="quick-customer-form" onSubmit={onSubmit} className="space-y-5" noValidate>
            
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="BUSINESS"
                  className="h-4 w-4 text-gold focus:ring-gold"
                  {...register("type")}
                />
                <span className="text-sm font-medium">Business</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="INDIVIDUAL"
                  className="h-4 w-4 text-gold focus:ring-gold"
                  {...register("type")}
                />
                <span className="text-sm font-medium">Individual</span>
              </label>
            </div>

            {customerType === "BUSINESS" && (
              <Input 
                label="Company Name" 
                placeholder="Business Name" 
                {...register("companyName")} 
                error={errors.companyName?.message} 
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Display Name *" 
                placeholder="Required" 
                {...register("name")} 
                error={errors.name?.message} 
              />
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="Email" 
                {...register("email")} 
                error={errors.email?.message} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Work Phone" 
                placeholder="Phone" 
                {...register("workPhone")} 
              />
              <Input 
                label="Mobile Phone" 
                placeholder="Mobile" 
                {...register("mobile")} 
              />
            </div>

            {customerType === "BUSINESS" && (
              <Input 
                label="GSTIN" 
                placeholder="GST Number" 
                {...register("gstin")} 
              />
            )}
            
            <Input 
              label="PAN" 
              placeholder="PAN Number" 
              {...register("pan")} 
            />

          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/5 px-6 py-4 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="quick-customer-form" loading={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            Create Customer
          </Button>
        </div>
      </div>
    </div>
  );
};
