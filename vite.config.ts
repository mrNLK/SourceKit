import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["lucide-react"],
        },
        chunkFileNames(chunkInfo) {
          // Recruiter OS gets its own chunk namespace
          if (chunkInfo.name?.startsWith('recruiter') || chunkInfo.facadeModuleId?.includes('/recruiter/')) {
            return 'assets/recruiter-[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
}));
