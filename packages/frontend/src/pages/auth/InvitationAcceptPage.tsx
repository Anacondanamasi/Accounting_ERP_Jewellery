import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

export const InvitationAcceptPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const existingToken = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [emailHint, setEmailHint] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const resolveInvitation = async () => {
      try {
        setLoading(true);
        const response = await api.post("/invitations/accept", null, { params: { token } });
        if (response.data.data?.requiresAuth) {
          setEmailHint(response.data.data.email ?? "");
          return;
        }
        const me = await authService.me();
        if (user && existingToken) {
          setAuth({
            user,
            token: existingToken,
            refreshToken: refreshToken ?? undefined,
            companies: me.companies,
            currentCompanyId: response.data.data?.companyId ?? me.companies[0]?.id ?? null,
          });
        }
        toast.success("Invitation accepted.");
        navigate("/");
      } catch {
        toast.error("Invitation link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    };
    resolveInvitation();
  }, [existingToken, navigate, refreshToken, setAuth, token, user]);

  if (!token) {
    return <div className="p-6 text-sm text-muted">Invitation link is missing.</div>;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-card">
        <h1 className="font-display text-3xl font-bold text-charcoal">Join company</h1>
        <p className="mt-2 text-sm text-muted">
          {loading
            ? "Processing invitation..."
            : emailHint
              ? `Sign in or register with ${emailHint} to accept this invitation.`
              : "Preparing invitation details..."}
        </p>
        {emailHint ? (
          <div className="mt-6 flex gap-3">
            <Link className="rounded border border-border px-3 py-2 text-sm" to={`/login?email=${encodeURIComponent(emailHint)}`}>
              Sign in
            </Link>
            <Link className="rounded-btn bg-gold px-3 py-2 text-sm text-white" to={`/register?email=${encodeURIComponent(emailHint)}`}>
              Register
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
};

