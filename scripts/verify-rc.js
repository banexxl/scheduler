/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * RC Verification Script — runs lint, type-check, tests, build
 * and outputs results to verify-rc-results.txt
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const resultsFile = path.join(__dirname, "..", "verify-rc-results.txt");
const results = [];

function run(label, cmd) {
  results.push(`\n=== ${label} ===`);
  results.push(`Command: ${cmd}`);
  try {
    const output = execSync(cmd, {
      encoding: "utf8",
      timeout: 120000,
      cwd: path.join(__dirname, ".."),
      stdio: "pipe",
    });
    results.push("Status: PASS");
    if (output.trim()) results.push(output.trim().slice(-500));
  } catch (e) {
    results.push("Status: FAIL");
    const stdout = String(e.stdout || "").trim().slice(-2000);
    const stderr = String(e.stderr || "").trim().slice(-2000);
    if (stdout) results.push("STDOUT: " + stdout);
    if (stderr) results.push("STDERR: " + stderr);
  }
}

run("TypeScript Type Check", "npx tsc --noEmit");
run("ESLint", "npx eslint . --max-warnings=100 --quiet");
run("Vitest Unit Tests", "npx vitest run --reporter=verbose 2>&1");

fs.writeFileSync(resultsFile, results.join("\n"), "utf8");
console.log("Results written to verify-rc-results.txt");
