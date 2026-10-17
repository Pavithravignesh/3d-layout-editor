// ES module resolve hook registered by scripts/office-register.mjs.
export async function resolve(specifier, context, next) {
  if (specifier === "esbuild") return next("esbuild-wasm", context);
  if (specifier === "rollup") return next("@rollup/wasm-node", context);
  if (specifier.startsWith("rollup/")) return next(`@rollup/wasm-node/${specifier.slice("rollup/".length)}`, context);
  return next(specifier, context);
}
