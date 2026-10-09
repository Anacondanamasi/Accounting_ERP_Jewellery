import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@jewelledger/shared";
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
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
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials and try again.";
      toast.error(errorMessage);
    }
  });

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold text-charcoal">HKS Accounting</h1>
          <p className="mt-2 text-sm text-muted">Precision accounting for jewellery businesses</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. rajesh@mehtajewellers.in"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex justify-end">
              <Link className="text-xs text-sapphire hover:underline" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
          </div>

          <Checkbox
            label="Remember me"
            {...register("rememberMe")}
          />

          {companies.length > 1 && (
            <p className="rounded-md bg-gold-tint p-3 text-xs text-gold">
              You will be prompted to select a company after signing in.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loginPending || isSubmitting}
            size="lg"
          >
            {loginPending ? "Authenticating..." : "Sign in"}
          </Button>

          <p className="text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link className="font-medium text-gold hover:underline" to="/register">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
