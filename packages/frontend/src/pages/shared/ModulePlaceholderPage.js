import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
export const ModulePlaceholderPage = ({ title, subtitle }) => (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: title, subtitle: subtitle ?? "Module scaffold created and route is active." }), _jsx(EmptyState, { icon: Wrench, title: "Module in progress", description: "This route is wired and ready for full feature implementation in upcoming steps." })] }));
