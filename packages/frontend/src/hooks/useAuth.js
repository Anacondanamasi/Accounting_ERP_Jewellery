import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
export const useAuth = () => {
    const { setAuth, logout, user } = useAuthStore();
    const loginMutation = useMutation({
        mutationFn: (payload) => authService.login(payload),
        onSuccess: (response) => {
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
