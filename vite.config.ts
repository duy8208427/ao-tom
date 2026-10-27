import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { pctomcaProxy } from "./server/proxy";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/pctomca": pctomcaProxy,
    },
  },
});
