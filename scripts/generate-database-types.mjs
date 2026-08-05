/**
 * Generate Supabase database TypeScript types.
 *
 * Usage:
 *   node scripts/generate-database-types.mjs
 *
 * Requires:
 *   - SUPABASE_PROJECT_ID environment variable
 *   - Supabase CLI authentication (npx supabase login)
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "..", "lib", "supabase", "database.types.ts");

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error("Error: SUPABASE_PROJECT_ID environment variable is not set.");
  console.error("");
  console.error("To fix this:");
  console.error("  1. Set SUPABASE_PROJECT_ID in your .env.local file");
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
