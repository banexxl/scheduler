/**
 * Generate Supabase database TypeScript types.
 *
 * Usage:
 *   node scripts/generate-database-types.mjs
 *
 * Requires:
 *   - SUPABASE_PROJECT_ID in .env file or environment
 *   - Supabase CLI authentication (npx supabase login)
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const OUTPUT_PATH = resolve(ROOT_DIR, "lib", "supabase", "database.types.ts");

/**
 * Load environment variables from a .env file if present.
 * Only sets variables that are not already defined in process.env.
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Load .env files (in order of precedence: .env.local > .env)
loadEnvFile(resolve(ROOT_DIR, ".env.local"));
loadEnvFile(resolve(ROOT_DIR, ".env"));

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error("Error: SUPABASE_PROJECT_ID environment variable is not set.");
  console.error("");
  console.error("To fix this:");
  console.error("  1. Set SUPABASE_PROJECT_ID in your .env file");
  console.error("  2. Or export it in your shell: set SUPABASE_PROJECT_ID=your-project-id");
  console.error("");
  console.error("Then run: npm run db:types");
  process.exit(1);
}

console.log(`Generating database types for project: ${projectId}`);
console.log(`Output: ${OUTPUT_PATH}`);

try {
  const output = execSync(
    `npx supabase gen types typescript --project-id ${projectId} --schema public`,
    {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  writeFileSync(OUTPUT_PATH, output, "utf-8");
  console.log("Database types generated successfully.");
} catch (error) {
  console.error("Failed to generate database types.");
  console.error("");

  if (error.stderr) {
    const sanitized = error.stderr.replace(/sb[a-z]_[^\s]+/g, "[REDACTED]");
    console.error("CLI output:", sanitized);
  }

  console.error("");
  console.error("Common fixes:");
  console.error("  - Run: npx supabase login");
  console.error("  - Verify SUPABASE_PROJECT_ID is correct");
  console.error("  - Ensure you have network access to Supabase");
  process.exit(1);
}
