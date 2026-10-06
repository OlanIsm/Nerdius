import { defineConfig } from "vite";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:4000" },
  },
  build: { assetsInlineLimit: 0 },
});
