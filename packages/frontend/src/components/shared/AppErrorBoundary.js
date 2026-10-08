import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
export class AppErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("Unhandled UI crash", error, info);
    }
    onReload = () => {
        window.location.reload();
    };
    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }
        return (_jsx("div", { className: "grid min-h-screen place-items-center bg-canvas p-6", children: _jsxs("div", { className: "w-full max-w-lg rounded-card border border-ruby/25 bg-card p-6 shadow-card", children: [_jsx("h1", { className: "font-display text-2xl font-semibold text-charcoal", children: "Something went wrong" }), _jsx("p", { className: "mt-2 text-sm text-muted", children: "The page hit an unexpected issue. Please reload and try again." }), _jsx("button", { className: "mt-5 h-10 rounded-btn bg-gold px-4 text-sm font-medium text-white", onClick: this.onReload, type: "button", children: "Reload application" })] }) }));
    }
}
