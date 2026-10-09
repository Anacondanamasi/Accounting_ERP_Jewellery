import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@jewelledger/shared";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
export const LoginPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const companies = useAuthStore((state) => state.companies);
    const switchCompany = useAuthStore((state) => state.switchCompany);
    const { login, loginPending } = useAuth();
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(loginSchema),
        mode: "onChange", // Real-time validation
        defaultValues: {
            email: searchParams.get("email") ?? "rajesh@mehtajewellers.in",
            password: "Password@123",
            rememberMe: true,
        },
    });
    const onSubmit = handleSubmit(async (values) => {
        try {
            const response = await login(values);
            toast.success("Welcome back");
            const activeCompanies = response.companies.filter((company) => company.membershipStatus === "active");
            if (activeCompanies.length === 0) {
                navigate("/onboarding/create-company");
                return;
            }
            if (activeCompanies.length === 1) {
                switchCompany(activeCompanies[0].id);
                navigate("/");
                return;
            }
            navigate("/select-company");
        }
        catch (err) {
            console.error("Login error:", err);
            const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials and try again.";
            toast.error(errorMessage);
        }
    });
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-canvas p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-card border border-border bg-card p-8 shadow-card", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "font-display text-4xl font-bold text-charcoal", children: "HKS Accounting" }), _jsx("p", { className: "mt-2 text-sm text-muted", children: "Precision accounting for jewellery businesses" })] }), _jsxs("form", { className: "space-y-6", onSubmit: onSubmit, noValidate: true, children: [_jsx(Input, { label: "Email Address", type: "email", placeholder: "e.g. rajesh@mehtajewellers.in", required: true, error: errors.email?.message, ...register("email") }), _jsxs("div", { className: "space-y-1", children: [_jsx(Input, { label: "Password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true, error: errors.password?.message, ...register("password") }), _jsx("div", { className: "flex justify-end", children: _jsx(Link, { className: "text-xs text-sapphire hover:underline", to: "/forgot-password", children: "Forgot password?" }) })] }), _jsx(Checkbox, { label: "Remember me", ...register("rememberMe") }), companies.length > 1 && (_jsx("p", { className: "rounded-md bg-gold-tint p-3 text-xs text-gold", children: "You will be prompted to select a company after signing in." })), _jsx(Button, { type: "submit", className: "w-full", loading: loginPending || isSubmitting, size: "lg", children: loginPending ? "Authenticating..." : "Sign in" }), _jsxs("p", { className: "text-center text-sm text-muted", children: ["Don't have an account?", " ", _jsx(Link, { className: "font-medium text-gold hover:underline", to: "/register", children: "Create one" })] })] })] }) }));
};
