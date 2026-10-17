// `npm run dev:office` / `build:office` / `test:office`: run Vite or Vitest on a machine whose
// Application Control policy blocks native binaries (esbuild.exe, rollup's .node file).
//  - Their WebAssembly builds (esbuild-wasm, @rollup/wasm-node) are installed with --no-save, so
//    package.json and the lockfile stay untouched (a later `npm install` removes them; this re-adds them).
//  - scripts/office-register.mjs routes `esbuild` and `rollup` imports to those builds in every process.
// On a normal machine use `npm run dev` / `build` / `test`; nothing here is needed.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const [command = "dev", ...args] = process.argv.slice(2);
const tools = { dev: ["vite"], build: ["vite", "build"], preview: ["vite", "preview"], test: ["vitest", "run"] };
if (!tools[command]) {
  console.error(`Unknown command "${command}". Use one of: ${Object.keys(tools).join(", ")}`);
  process.exit(1);
}

const version = (pkg) => JSON.parse(readFileSync(path.join(root, "node_modules", pkg, "package.json"), "utf8")).version;
if (!existsSync(path.join(root, "node_modules", "vite"))) {
  // esbuild's postinstall runs the blocked esbuild.exe, so install without lifecycle scripts.
  const r = spawnSync("npm", ["install", "--ignore-scripts", "--no-fund", "--no-audit"], { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const wasm = [
  ["esbuild-wasm", version("esbuild")],
  ["@rollup/wasm-node", version("rollup")],
];
const missing = wasm.filter(([pkg, v]) => !existsSync(path.join(root, "node_modules", pkg)) || version(pkg) !== v);
if (missing.length) {
  const specs = missing.map(([pkg, v]) => `${pkg}@${v}`);
  console.log(`Installing WebAssembly builds (not saved to package.json): ${specs.join(" ")}`);
  const r = spawnSync("npm", ["install", "--no-save", "--ignore-scripts", "--no-fund", "--no-audit", ...specs], {
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const register = pathToFileURL(path.join(root, "scripts", "office-register.mjs")).href;
const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${register}`, "--no-warnings=ExperimentalWarning"]
    .filter(Boolean)
    .join(" "),
};
const [bin, ...toolArgs] = tools[command];
const child = spawn("npx", [bin, ...toolArgs, ...args], { stdio: "inherit", env, shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
