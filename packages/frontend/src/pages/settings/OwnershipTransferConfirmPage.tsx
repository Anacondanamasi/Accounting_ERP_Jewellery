import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const confirm = async () => {
    if (!token) return;
    try {
      setLoading(true);
      await teamService.confirmTransfer(token);
      toast.success("Ownership transferred successfully!");
      // Force logout to refresh session/roles
      logout();
      navigate("/login?message=Ownership transferred. Please sign in again.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Unable to complete transfer.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto h-12 w-12 text-ruby" />
          <h1 className="mt-4 text-xl font-bold text-charcoal">Invalid Link</h1>
          <p className="mt-2 text-muted">This ownership transfer link is missing or invalid.</p>
          <button 
            className="mt-6 h-10 w-full rounded-btn bg-charcoal text-sm text-white"
            onClick={() => navigate("/")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg rounded-card border border-border bg-card p-10 shadow-card text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <ShieldCheck className="h-8 w-8 text-gold" />
        </div>
        
        <h1 className="mt-6 text-2xl font-bold text-charcoal">Confirm Ownership Transfer</h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          You have been invited to take over ownership of this company. 
          By clicking confirm, you will become the primary owner, and the current owner 
          will be demoted to an administrator.
        </p>

        {error && (
          <div className="mt-6 rounded-md bg-ruby/5 border border-ruby/20 p-4 text-sm text-ruby">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-btn bg-gold text-white font-bold hover:bg-gold/90 transition-all disabled:opacity-50"
            onClick={confirm}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Accept Ownership"}
          </button>
          <button
            disabled={loading}
            className="h-12 rounded-btn border border-border bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
