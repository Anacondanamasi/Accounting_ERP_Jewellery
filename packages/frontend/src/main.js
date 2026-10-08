import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/router";
import { AppErrorBoundary } from "@/components/shared/AppErrorBoundary";
import { isRetryableError } from "@/lib/apiError";
import "@/styles/globals.css";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(AppErrorBoundary, { children: _jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(RouterProvider, { router: router }), _jsx(Toaster, { position: "top-right", richColors: true })] }) }) }));
