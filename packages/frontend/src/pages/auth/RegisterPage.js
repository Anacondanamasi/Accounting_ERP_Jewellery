import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerSchema } from "@jewelledger/shared";
import { authService } from "@/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export const RegisterPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            fullName: "",
            email: searchParams.get("email") ?? "",
            password: "",
            phone: "",
        },
    });
    const onSubmit = handleSubmit(async (values) => {
        try {
            await authService.register({
                ...values,
                phone: values.phone || null,
            });
            toast.success("Account created successfully. You can now sign in.");
            navigate(`/login?email=${encodeURIComponent(values.email)}`);
        }
        catch (err) {
            console.error("Registration error:", err);
            const errorMessage = err.response?.data?.message || "Unable to register. Please check your details and try again.";
            toast.error(errorMessage);
        }
    });
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-canvas p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-card border border-border bg-card p-8 shadow-card", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "font-display text-4xl font-bold text-charcoal", children: "Create Account" }), _jsx("p", { className: "mt-2 text-sm text-muted", children: "Set up your workspace access" })] }), _jsxs("form", { className: "space-y-6", onSubmit: onSubmit, noValidate: true, children: [_jsx(Input, { label: "Full Name", placeholder: "e.g. Rajesh Mehta", required: true, error: errors.fullName?.message, ...register("fullName") }), _jsx(Input, { label: "Email Address", type: "email", placeholder: "e.g. rajesh@mehtajewellers.in", required: true, error: errors.email?.message, ...register("email") }), _jsx(Input, { label: "Phone Number", placeholder: "e.g. +91 98765 43210", error: errors.phone?.message, ...register("phone") }), _jsx(Input, { label: "Password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true, error: errors.password?.message, ...register("password"), containerClassName: "mb-2" }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted font-semibold", children: "Password Requirements" }), _jsxs("ul", { className: "text-xs text-muted list-disc list-inside space-y-1", children: [_jsx("li", { children: "At least 8 characters long" }), _jsx("li", { children: "One uppercase & one lowercase letter" }), _jsx("li", { children: "At least one number" })] })] }), _jsx(Button, { type: "submit", className: "w-full", loading: isSubmitting, size: "lg", children: "Create Account" }), _jsxs("p", { className: "text-center text-sm text-muted", children: ["Already have an account?", " ", _jsx(Link, { className: "font-medium text-gold hover:underline", to: "/login", children: "Sign in" })] })] })] }) }));
};
