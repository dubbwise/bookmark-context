import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Chrome extensions load files via chrome-extension:// scheme. crossorigin
// attributes on module scripts trigger CORS-mode fetches which return
// application/octet-stream, causing strict MIME type errors. Strip them.
const removeCrossorigin = {
  name: "remove-crossorigin",
  transformIndexHtml: {
    order: "post" as const,
    handler: (html: string) => html.replace(/ crossorigin/g, ""),
  },
};

export default defineConfig({
  // Relative paths are required for chrome-extension:// URLs.
  base: "./",
  plugins: [
    react(),
    webExtension(),
    removeCrossorigin,
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
