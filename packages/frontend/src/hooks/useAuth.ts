import { useMutation } from "@tanstack/react-query";
import type { LoginInput, LoginResponse } from "@jewelledger/shared";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

export const useAuth = () => {
  const { setAuth, logout, user } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (payload: LoginInput) => authService.login(payload),
    onSuccess: (response: LoginResponse) => {
      setAuth({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        companies: response.companies,
        currentCompanyId: response.activeCompanyId ?? response.companies[0]?.id ?? null,
      });
    },
  });

  return {
    user,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    logout,
  };
};
