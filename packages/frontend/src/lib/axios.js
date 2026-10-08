import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage, isRetryableError } from "@/lib/apiError";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";
const API_TIMEOUT_MS = 30_000;
let sessionExpiryNotified = false;
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
const forceLogout = () => {
    if (!sessionExpiryNotified) {
        toast.warning("Your session has expired. Please sign in again.");
        sessionExpiryNotified = true;
        window.setTimeout(() => { sessionExpiryNotified = false; }, 5000);
    }
    useAuthStore.getState().logout();
};
export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: API_TIMEOUT_MS,
});
api.interceptors.request.use((config) => {
    const { token, currentCompanyId, companies } = useAuthStore.getState();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const selectedCompanyId = currentCompanyId ?? companies.find((company) => company.membershipStatus === "active")?.id;
    if (selectedCompanyId) {
        config.headers["X-Company-ID"] = selectedCompanyId;
    }
    return config;
});
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    // On 401: attempt silent token refresh before logging out
    if (status === 401 && !originalRequest._retry) {
        const { refreshToken, setAuth, user, companies, currentCompanyId } = useAuthStore.getState();
        // No refresh token → force logout immediately
        if (!refreshToken) {
            forceLogout();
            return Promise.reject(error);
        }
        // If already refreshing, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api.request(originalRequest);
            })
                .catch((err) => Promise.reject(err));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: API_TIMEOUT_MS });
            const newAccessToken = response.data?.data?.accessToken ?? response.data?.data?.token;
            if (!newAccessToken)
                throw new Error("No access token in refresh response");
            // Persist new token to store
            if (user) {
                setAuth({
                    user,
                    token: newAccessToken,
                    refreshToken,
                    companies,
                    currentCompanyId,
                });
            }
            processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api.request(originalRequest);
        }
        catch (refreshError) {
            processQueue(refreshError, null);
            forceLogout();
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    const enriched = error;
    enriched.userMessage = getApiErrorMessage(error);
    enriched.isRetryable = isRetryableError(error);
    enriched.retryRequest = () => (error.config ? api.request(error.config) : Promise.reject(error));
    return Promise.reject(error);
});
