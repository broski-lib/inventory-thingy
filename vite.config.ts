import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Clerk's React SDK lazy-loaded chunk references the Node.js `global`
  // symbol, which doesn't exist in the browser. Alias it to `globalThis`
  // at build time so every page (not just the SSR-rendered home route)
  // can hydrate without `ReferenceError: global is not defined`.
  define: {
    global: "globalThis",
  },
  plugins: [
    devtools(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
