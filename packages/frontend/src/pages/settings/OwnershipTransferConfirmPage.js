import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { teamService } from "@/services/teamService";
import { useAuthStore } from "@/stores/authStore";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
export const OwnershipTransferConfirmPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const logout = useAuthStore((state) => state.logout);
    const confirm = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            await teamService.confirmTransfer(token);
            toast.success("Ownership transferred successfully!");
            // Force logout to refresh session/roles
            logout();
            navigate("/login?message=Ownership transferred. Please sign in again.");
        }
        catch (err) {
            const msg = err.response?.data?.message || "Unable to complete transfer.";
            setError(msg);
            toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    if (!token) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-card", children: [_jsx(AlertTriangle, { className: "mx-auto h-12 w-12 text-ruby" }), _jsx("h1", { className: "mt-4 text-xl font-bold text-charcoal", children: "Invalid Link" }), _jsx("p", { className: "mt-2 text-muted", children: "This ownership transfer link is missing or invalid." }), _jsx("button", { className: "mt-6 h-10 w-full rounded-btn bg-charcoal text-sm text-white", onClick: () => navigate("/"), children: "Back to Dashboard" })] }) }));
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center p-4 bg-slate-50", children: _jsxs("div", { className: "w-full max-w-lg rounded-card border border-border bg-card p-10 shadow-card text-center", children: [_jsx("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10", children: _jsx(ShieldCheck, { className: "h-8 w-8 text-gold" }) }), _jsx("h1", { className: "mt-6 text-2xl font-bold text-charcoal", children: "Confirm Ownership Transfer" }), _jsx("p", { className: "mt-4 text-slate-600 leading-relaxed", children: "You have been invited to take over ownership of this company. By clicking confirm, you will become the primary owner, and the current owner will be demoted to an administrator." }), error && (_jsx("div", { className: "mt-6 rounded-md bg-ruby/5 border border-ruby/20 p-4 text-sm text-ruby", children: error })), _jsxs("div", { className: "mt-8 flex flex-col gap-3", children: [_jsx("button", { disabled: loading, className: "flex h-12 items-center justify-center gap-2 rounded-btn bg-gold text-white font-bold hover:bg-gold/90 transition-all disabled:opacity-50", onClick: confirm, children: loading ? _jsx(Loader2, { className: "h-5 w-5 animate-spin" }) : "Accept Ownership" }), _jsx("button", { disabled: loading, className: "h-12 rounded-btn border border-border bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors", onClick: () => navigate("/"), children: "Cancel" })] })] }) }));
};
