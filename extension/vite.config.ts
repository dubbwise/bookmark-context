import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Chrome extensions use chrome-extension:// scheme.
// - crossorigin on <script type="module"> triggers CORS mode; chrome-extension://
//   responses don't carry CORS headers → browser falls back to application/octet-stream
//   and strict module MIME checking rejects the script.
// - The modulepreload polyfill is unnecessary for Chrome 66+ and can interfere.
const removeCrossorigin = {
  name: "remove-crossorigin",
  transformIndexHtml: {
    order: "post" as const,
    handler: (html: string) => html.replace(/ crossorigin/g, ""),
  },
};

export default defineConfig({
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
    modulePreload: { polyfill: false },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
