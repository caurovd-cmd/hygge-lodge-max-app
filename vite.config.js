import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main:       "./index.html",
        admin:      "./admin.html",
        superadmin: "./superadmin.html",
      },
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: true,
    allowedHosts: "all",
  },
});
