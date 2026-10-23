import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Clear NODE_OPTIONS for Vitest without relying on POSIX-only shell syntax.
// npm runs scripts through cmd.exe on Windows, where "NODE_OPTIONS= vitest run"
// is interpreted as a command rather than an environment assignment.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vitestCli = resolve(projectRoot, "node_modules", "vitest", "vitest.mjs");

const child = spawn(process.execPath, [vitestCli, ...process.argv.slice(2)], {
  env: { ...process.env, NODE_OPTIONS: "" },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start Vitest:", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Vitest exited after signal: ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
