// Loaded with --import by scripts/office.mjs. Sends `esbuild` and `rollup` to their WebAssembly builds,
// for ES module imports (resolve hook) and for require() calls (CommonJS resolver patch).
import Module, { register } from "node:module";

register("./office-hooks.mjs", import.meta.url);

const redirect = (request) => {
  if (request === "esbuild") return "esbuild-wasm";
  if (request === "rollup") return "@rollup/wasm-node";
  if (request.startsWith("rollup/")) return `@rollup/wasm-node/${request.slice("rollup/".length)}`;
  return request;
};

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, redirect(request), ...rest);
};
