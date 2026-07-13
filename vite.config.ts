import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("node_modules") < 0) return;
          if (id.indexOf("/@tiptap/") >= 0 || id.indexOf("/prosemirror-") >= 0) return "editor-vendor";
          if (id.indexOf("/react/") >= 0 || id.indexOf("/react-dom/") >= 0 || id.indexOf("/scheduler/") >= 0) return "react-vendor";
          if (id.indexOf("/lucide-react/") >= 0) return "icons";
          if (id.indexOf("/@tauri-apps/") >= 0) return "desktop-vendor";
          if (id.indexOf("/zod/") >= 0) return "validation";
        },
      },
    },
  },
});
