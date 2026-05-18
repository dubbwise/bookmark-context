import React from "react";
import ReactDOM from "react-dom/client";
import "./app.css";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import { applyTheme, getStoredTheme, watchSystemTheme } from "../lib/theme";

async function bootstrap() {
  const theme = await getStoredTheme();
  applyTheme(theme);

  watchSystemTheme(() => {
    void getStoredTheme().then((stored) => {
      if (stored === "system") applyTheme("system");
    });
  });

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
      <Toaster position="top-center" />
    </React.StrictMode>,
  );
}

void bootstrap();
