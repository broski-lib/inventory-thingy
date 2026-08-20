import { defineConfig } from "vitest/config"
import { devtools } from "@tanstack/devtools-vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "cloudflare:workers": "/src/__mocks__/cloudflare-workers.ts",
    },
  },
  define: {
    global: "globalThis",
  },
  plugins: [
    devtools(),
    tailwindcss(),
    viteReact(),
  ],
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/db.ts",
        "src/lib/schema.ts",
        "src/lib/item-status.ts",
        "src/lib/batches.ts",
        "src/lib/categories.ts",
        "src/lib/inventory.ts",
        "src/lib/racks.ts",
        "src/lib/scan-queries.ts",
        "src/lib/tags.ts",
        "src/lib/queries.ts",
        "src/lib/auth-guard.ts",
        "src/lib/image-upload.ts",
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
      reporter: ["text", "html", "lcov"],
    },
  },
})
