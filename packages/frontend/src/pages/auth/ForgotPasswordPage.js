import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@jewelledger/shared";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export const ForgotPasswordPage = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onChange",
        defaultValues: { email: "" },
    });
    const onSubmit = handleSubmit(async (values) => {
        try {
            await authService.forgotPassword(values);
            toast.success("Password reset link sent to your email.");
        }
        catch (err) {
            toast.error(err.response?.data?.message || "Unable to send reset link. Please try again.");
        }
    });
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-canvas p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-card border border-border bg-card p-8 shadow-card", children: [_jsx("h1", { className: "mb-2 font-display text-3xl font-bold text-charcoal", children: "Forgot Password" }), _jsx("p", { className: "mb-8 text-sm text-muted", children: "Enter your email to receive reset instructions." }), _jsxs("form", { className: "space-y-6", onSubmit: onSubmit, noValidate: true, children: [_jsx(Input, { label: "Email Address", type: "email", placeholder: "e.g. rajesh@mehtajewellers.in", required: true, error: errors.email?.message, ...register("email") }), _jsx(Button, { type: "submit", className: "w-full", loading: isSubmitting, size: "lg", children: "Send Reset Link" }), _jsx(Link, { className: "mt-4 block text-center text-sm text-sapphire hover:underline", to: "/login", children: "Back to login" })] })] }) }));
};
