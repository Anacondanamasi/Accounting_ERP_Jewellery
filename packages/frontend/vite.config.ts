import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prefer TypeScript source over stale compiled JS files that may coexist in src/.
    extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"],
  },
});
