import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "var(--gold)",
        "gold-light": "var(--gold-light)",
        "gold-tint": "var(--gold-tint)",
        charcoal: "var(--charcoal)",
        canvas: "var(--canvas)",
        card: "var(--card)",
        emerald: "var(--emerald)",
        ruby: "var(--ruby)",
        sapphire: "var(--sapphire)",
        muted: "var(--muted)",
        border: "var(--border)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        badge: "var(--radius-badge)",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
        header: "var(--header-h)",
      },
    },
  },
  plugins: [],
};

export default config;
