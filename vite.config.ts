import path from "node:path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages serves this project under /life-tracker/, so the production
// build needs that base path. Dev keeps "/" so localhost stays at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/life-tracker/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
