import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    global: "globalThis",
  },
  build: {
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_filename, deps, _context) => {
        // Don't modulepreload large shared chunks — the browser will
        // fetch them on demand via dynamic import instead of blocking
        // the initial page paint.
        const skipPatterns = [
          /select-/,
          /drawer-/,
          /db-/,
          /esm-/,
          /cler[kK]/i,
        ]
        for (const dep of deps) {
          if (skipPatterns.some((p) => p.test(dep))) {
            return []
          }
        }
        return deps
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@clerk")) return "vendor-clerk"
          if (id.includes("node_modules/drizzle-orm")) return "vendor-drizzle"
          if (id.includes("node_modules/@tanstack/react-query")) return "vendor-query"
          if (id.includes("node_modules/qrcode")) return "vendor-qrcode"
        },
      },
    },
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
