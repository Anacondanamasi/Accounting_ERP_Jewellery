"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { signInWithPassword, signUpWithPassword } from "@/services/auth-service";
import { useAuth } from "@/hooks/use-auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitLabel = mode === "login" ? "Login" : "Create account";

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{submitLabel}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Use the same Supabase credentials as your mobile app.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setLoading(true);

          const response =
            mode === "login"
              ? await signInWithPassword(email, password)
              : await signUpWithPassword(email, password);

          if (response.error) {
            setError(response.error.message);
            setLoading(false);
            return;
          }

          await refresh();
          setLoading(false);
          router.push("/dashboard");
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Please wait..." : submitLabel}
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          {mode === "login" ? "Sign up" : "Login"}
        </Link>
      </p>
    </div>
  );
}
