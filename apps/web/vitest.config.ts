import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./$1", import.meta.url)),
      },
      {
        find: /^@workspace\/validation$/,
        replacement: fileURLToPath(
          new URL("../../packages/validation/src/index.ts", import.meta.url)
        ),
      },
      {
        find: /^@workspace\/validation\/(.*)$/,
        replacement: fileURLToPath(
          new URL("../../packages/validation/src/$1.ts", import.meta.url)
        ),
      },
    ],
  },
  test: {
    exclude: [".next/**", "node_modules/**"],
    include: ["**/*.spec.ts", "**/*.spec.tsx"],
  },
})
