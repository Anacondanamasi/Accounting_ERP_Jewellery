import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema } from "@jewelledger/shared";
import { toast } from "sonner";
import { X, Save, User, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/axios";
export const QuickCustomerModal = ({ initialName = "", onClose, onSuccess }) => {
    const { register, handleSubmit, watch, formState: { errors, isSubmitting }, } = useForm({
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
        }
        catch (error) {
            toast.error(error.userMessage || "Failed to create customer");
        }
    });
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200", children: _jsxs("div", { className: "w-full max-w-xl rounded-xl bg-card shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-4 bg-muted/10", children: [_jsxs("h2", { className: "text-lg font-semibold text-charcoal flex items-center gap-2", children: [customerType === "BUSINESS" ? _jsx(Building2, { className: "h-5 w-5 text-gold" }) : _jsx(User, { className: "h-5 w-5 text-gold" }), "Quick Create Customer"] }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-black/5 rounded text-muted transition-colors", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs("form", { id: "quick-customer-form", onSubmit: onSubmit, className: "space-y-5", noValidate: true, children: [_jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", value: "BUSINESS", className: "h-4 w-4 text-gold focus:ring-gold", ...register("type") }), _jsx("span", { className: "text-sm font-medium", children: "Business" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", value: "INDIVIDUAL", className: "h-4 w-4 text-gold focus:ring-gold", ...register("type") }), _jsx("span", { className: "text-sm font-medium", children: "Individual" })] })] }), customerType === "BUSINESS" && (_jsx(Input, { label: "Company Name", placeholder: "Business Name", ...register("companyName"), error: errors.companyName?.message })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Display Name *", placeholder: "Required", ...register("name"), error: errors.name?.message }), _jsx(Input, { label: "Email Address", type: "email", placeholder: "Email", ...register("email"), error: errors.email?.message })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Work Phone", placeholder: "Phone", ...register("workPhone") }), _jsx(Input, { label: "Mobile Phone", placeholder: "Mobile", ...register("mobile") })] }), customerType === "BUSINESS" && (_jsx(Input, { label: "GSTIN", placeholder: "GST Number", ...register("gstin") })), _jsx(Input, { label: "PAN", placeholder: "PAN Number", ...register("pan") })] }) }), _jsxs("div", { className: "border-t border-border bg-muted/5 px-6 py-4 flex items-center justify-end gap-3", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "Cancel" }), _jsxs(Button, { type: "submit", form: "quick-customer-form", loading: isSubmitting, children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), "Create Customer"] })] })] }) }));
};
