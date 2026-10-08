import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [loading, setLoading] = useState(false);
    const token = searchParams.get("token");
    const email = searchParams.get("email") ?? "";
    useEffect(() => {
        if (!token)
            return;
        const verify = async () => {
            try {
                setLoading(true);
                const tokens = await authService.verifyEmail(token);
                setAuth({
                    user: tokens.user,
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    companies: tokens.companies,
                    currentCompanyId: tokens.activeCompanyId ?? tokens.companies[0]?.id ?? null,
                });
                toast.success("Email verified.");
                if (tokens.companies.length === 0) {
                    navigate("/onboarding/create-company");
                }
                else if (tokens.companies.length === 1) {
                    navigate("/");
                }
                else {
                    navigate("/select-company");
                }
            }
            catch {
                toast.error("Verification link is invalid or expired.");
            }
            finally {
                setLoading(false);
            }
        };
        verify();
    }, [navigate, setAuth, token]);
    const resend = async () => {
        if (!email)
            return;
        try {
            await authService.resendVerification(email);
            toast.success("Verification email sent.");
        }
        catch {
            toast.error("Unable to resend verification email.");
        }
    };
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-canvas p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-card border border-border bg-card p-6 shadow-card", children: [_jsx("h1", { className: "mb-2 font-display text-3xl font-bold text-charcoal", children: "Verify your email" }), _jsx("p", { className: "text-sm text-muted", children: token
                        ? "Verifying your email now..."
                        : "Check your inbox and open the verification link to continue." }), loading ? _jsx("p", { className: "mt-4 text-sm text-muted", children: "Please wait..." }) : null, !token && email ? (_jsx("button", { className: "mt-6 h-10 w-full rounded-btn bg-gold px-4 text-sm font-medium text-white hover:bg-gold/90", onClick: resend, type: "button", children: "Resend verification email" })) : null] }) }));
};
