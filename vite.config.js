import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: "APP_",
  resolve: {
    // Prevent multiple React instances (e.g. when hoisted node_modules exist)
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
});
