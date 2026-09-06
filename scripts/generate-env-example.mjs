#!/usr/bin/env node

/**
 * Regenerates `.env.example` from `.env`.
 *
 * Rules:
 * - Preserves comments, blank lines, and key order/structure.
 * - Strips all secret values (blanks them out).
 * - Keeps safe, non-sensitive default values (public config, URLs, ports,
 *   booleans, enum-like flags) so the example stays useful.
 *
 * Never writes real secrets into `.env.example`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");
const sourcePath = join(projectRoot, ".env");
const targetPath = join(projectRoot, ".env.example");

/**
 * Keys whose values are safe (non-sensitive) and should be kept as-is.
 * Everything else has its value blanked out.
 */
const SAFE_KEYS = new Set([
     "NEXT_PUBLIC_APP_NAME",
     "NEXT_PUBLIC_APP_URL",
     "NEXT_PUBLIC_ROOT_DOMAIN",
     "EMAIL_PROVIDER",
     "SMTP_PORT",
     "SMTP_SECURE",
     "POLAR_API_BASE_URL",
     "POLAR_SERVER",
     "E2E_TEST_MODE",
     "TEST_BASE_URL",
     "TEST_TENANT_SLUG",
     "TEST_PUBLIC_TENANT_SLUG",
     "PUBLIC_APP_URL",
     "LOG_LEVEL",
]);

if (!existsSync(sourcePath)) {
     console.error("Cannot generate .env.example: .env not found.");
     process.exit(1);
}

const source = readFileSync(sourcePath, "utf8");
const lines = source.split(/\r?\n/);

const KEY_VALUE = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

const output = lines.map((line) => {
     const match = line.match(KEY_VALUE);
     if (!match) {
          // Comment, blank line, or anything non key=value: keep verbatim.
          return line;
     }

     const [, indent, key] = match;
     if (SAFE_KEYS.has(key)) {
          return line;
     }

     return `${ indent }${ key }=`;
});

const result = output.join("\n");
writeFileSync(targetPath, result, "utf8");

console.log(`Generated .env.example from .env (${ lines.length } lines).`);
