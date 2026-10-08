import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema } from "@jewelledger/shared";
import { toast } from "sonner";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
export const CustomerFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);
    const [activeTab, setActiveTab] = useState("other");
    const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting }, } = useForm({
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
                    }
                }
                catch (error) {
                    toast.error("Failed to fetch customer data");
                }
            };
            fetchCustomer();
        }
    }, [id, isEditing, reset]);
    const customerType = watch("type");
    const onSubmit = handleSubmit(async (data) => {
        try {
            if (isEditing) {
                await api.put(`/customers/${id}`, data);
                toast.success("Customer updated successfully");
            }
            else {
                await api.post("/customers", data);
                toast.success("Customer created successfully");
            }
            navigate("/customers");
        }
        catch (error) {
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
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx("div", { className: "flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => navigate("/customers"), className: "flex h-8 w-8 items-center justify-center rounded-full hover:bg-canvas transition-colors", children: _jsx(ArrowLeft, { className: "h-5 w-5 text-muted" }) }), _jsx("h1", { className: "text-xl font-semibold text-charcoal", children: isEditing ? "Edit Customer" : "New Customer" })] }) }), _jsx("div", { className: "flex-1 overflow-auto bg-canvas p-6", children: _jsxs("form", { onSubmit: onSubmit, className: "mx-auto max-w-4xl space-y-8", noValidate: true, children: [_jsxs("div", { className: "rounded-md border border-sapphire/20 bg-sapphire/5 p-4 flex items-center gap-3", children: [_jsx(Building2, { className: "h-5 w-5 text-sapphire" }), _jsxs("p", { className: "text-sm text-sapphire-dark", children: ["Prefill Customer details from the GST portal using the Customer's GSTIN.", _jsx("button", { type: "button", className: "ml-2 font-medium text-sapphire hover:underline", children: "Prefill >" })] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-6 shadow-sm space-y-6", children: [_jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Customer Type" }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", value: "BUSINESS", className: "h-4 w-4 text-gold focus:ring-gold", ...register("type") }), _jsx("span", { className: "text-sm", children: "Business" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", value: "INDIVIDUAL", className: "h-4 w-4 text-gold focus:ring-gold", ...register("type") }), _jsx("span", { className: "text-sm", children: "Individual" })] })] })] }), _jsxs("div", { className: "flex items-start gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted pt-2", children: "Primary Contact" }), _jsxs("div", { className: "flex-1 grid grid-cols-3 gap-4", children: [_jsx(Select, { options: [
                                                        { value: "Mr.", label: "Mr." },
                                                        { value: "Mrs.", label: "Mrs." },
                                                        { value: "Ms.", label: "Ms." },
                                                        { value: "Dr.", label: "Dr." },
                                                    ], placeholder: "Salutation" }), _jsx("div", { className: "col-span-2", children: _jsx(Input, { placeholder: "Full Name", ...register("name"), error: errors.name?.message }) })] })] }), customerType === "BUSINESS" && (_jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Company Name" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "Company Name", ...register("companyName") }) })] })), _jsxs("div", { className: "flex items-center gap-8", children: [_jsxs("span", { className: "w-48 text-sm font-medium text-muted flex items-center gap-1", children: ["Display Name ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "Display Name (Required)", ...register("name"), error: errors.name?.message }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Email Address" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { type: "email", placeholder: "Email", ...register("email"), error: errors.email?.message }) })] }), _jsxs("div", { className: "flex items-start gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted pt-2", children: "Phone" }), _jsxs("div", { className: "flex-1 grid grid-cols-2 gap-4", children: [_jsx(Input, { placeholder: "Work Phone", ...register("workPhone") }), _jsx(Input, { placeholder: "Mobile", ...register("mobile") })] })] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card shadow-sm", children: [_jsx("div", { className: "flex overflow-x-auto border-b border-border px-2", children: tabs.map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.id), className: cn("whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors", activeTab === tab.id
                                            ? "border-b-2 border-gold text-charcoal"
                                            : "text-muted hover:text-charcoal"), children: tab.label }, tab.id))) }), _jsxs("div", { className: "p-6", children: [activeTab === "other" && (_jsxs("div", { className: "space-y-6 max-w-2xl", children: [customerType === "BUSINESS" && (_jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "GSTIN" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "GSTIN", ...register("gstin") }) })] })), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "PAN" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "PAN", ...register("pan") }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Currency" }), _jsx("div", { className: "flex-1", children: _jsx(Select, { options: [{ value: "INR", label: "INR - Indian Rupee" }], value: "INR" }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Credit Limit" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { type: "number", placeholder: "0.00", ...register("creditLimit"), error: errors.creditLimit?.message }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Credit Days" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { type: "number", placeholder: "0", ...register("creditDays"), error: errors.creditDays?.message }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Opening Balance" }), _jsx("div", { className: "flex-1", children: _jsx(Input, { type: "number", placeholder: "0.00", ...register("openingBalance"), error: errors.openingBalance?.message }) })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: "w-48 text-sm font-medium text-muted", children: "Payment Terms" }), _jsx("div", { className: "flex-1", children: _jsx(Select, { options: [
                                                                    { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
                                                                    { value: "NET_15", label: "Net 15" },
                                                                    { value: "NET_30", label: "Net 30" },
                                                                ], placeholder: "Select Payment Terms" }) })] })] })), activeTab === "address" && (_jsxs("div", { className: "grid grid-cols-2 gap-12", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "font-medium text-charcoal", children: "Billing Address" }), _jsx(Input, { placeholder: "Street 1", ...register("billingAddress.street") }), _jsx(Input, { placeholder: "City", ...register("billingAddress.city") }), _jsx(Input, { placeholder: "State", ...register("billingAddress.state") }), _jsx(Input, { placeholder: "Zip Code", ...register("billingAddress.zip") })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "font-medium text-charcoal", children: "Shipping Address" }), _jsx(Input, { placeholder: "Street 1", ...register("shippingAddress.street") }), _jsx(Input, { placeholder: "City", ...register("shippingAddress.city") }), _jsx(Input, { placeholder: "State", ...register("shippingAddress.state") }), _jsx(Input, { placeholder: "Zip Code", ...register("shippingAddress.zip") })] })] })), activeTab === "remarks" && (_jsx("div", { className: "space-y-4", children: _jsx("textarea", { className: "w-full h-32 rounded-md border border-border p-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold", placeholder: "Add internal remarks about this customer...", ...register("notes") }) })), (activeTab === "contact" || activeTab === "custom") && (_jsx("div", { className: "py-8 text-center text-sm text-muted", children: "Coming soon..." }))] })] }), _jsxs("div", { className: "flex items-center gap-4 pt-4 pb-12", children: [_jsxs(Button, { type: "submit", loading: isSubmitting, children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), "Save"] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate("/customers"), children: "Cancel" })] })] }) })] }));
};
