import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@jewelledger/shared";
import { authService } from "@/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
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
    } catch (err: any) {
      console.error("Registration error:", err);
      const errorMessage = err.response?.data?.message || "Unable to register. Please check your details and try again.";
      toast.error(errorMessage);
    }
  });

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold text-charcoal">Create Account</h1>
          <p className="mt-2 text-sm text-muted">Set up your workspace access</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <Input
            label="Full Name"
            placeholder="e.g. Rajesh Mehta"
            required
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. rajesh@mehtajewellers.in"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Phone Number"
            placeholder="e.g. +91 98765 43210"
            error={errors.phone?.message}
            {...register("phone")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            required
            error={errors.password?.message}
            {...register("password")}
            containerClassName="mb-2"
          />

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Password Requirements</p>
            <ul className="text-xs text-muted list-disc list-inside space-y-1">
              <li>At least 8 characters long</li>
              <li>One uppercase & one lowercase letter</li>
              <li>At least one number</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            size="lg"
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link className="font-medium text-gold hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
