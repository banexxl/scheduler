import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load .env so integration tests have access to Supabase keys
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    globalSetup: ["./tests/helpers/vitest-global-teardown.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
