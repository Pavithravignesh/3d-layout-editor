// Optimises one heavy glTF model the way Section 9.1 of the design document describes, and
// reports before and after: file size, triangles, draw calls (primitives) and textures.
//
// Usage: node tools/optimise-model.mjs <input.gltf> <outDir> [--ktx2]
//   --ktx2  resize textures and encode them to KTX2. Needs the `toktx` program and
//           @gltf-transform/cli, so it runs in CI (.github/workflows/optimise-model.yml).
//           Without it, textures are copied unchanged and the report says so.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const useKtx2 = process.argv.includes('--ktx2');
if (!input || !outDir) {
  console.error('Usage: node tools/optimise-model.mjs <input.gltf> <outDir> [--ktx2]');
  process.exit(1);
}

/** Levels of detail and their triangle budgets from Section 9.2; texture size per level. */
const LODS = [
  { name: 'lod0', maxTriangles: 10_000, error: 0.001, texture: 1024 },
  { name: 'lod1', maxTriangles: 2_500, error: 0.01, texture: 1024 },
  { name: 'lod2', maxTriangles: 500, error: 0.05, texture: 256 },
];

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Bytes on disk for a .glb, or a .gltf plus every file it references. */
function diskBytes(file) {
  if (file.endsWith('.glb')) return fs.statSync(file).size;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(file);
  const uris = [...(json.buffers ?? []), ...(json.images ?? [])].map((r) => r.uri).filter(Boolean);
  return fs.statSync(file).size + uris.reduce((sum, uri) => sum + fs.statSync(path.join(dir, decodeURI(uri))).size, 0);
}

function stats(doc) {
  const root = doc.getRoot();
  let triangles = 0;
  let drawCalls = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      drawCalls += 1;
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : prim.getAttribute('POSITION').getCount();
      triangles += Math.round(count / 3);
    }
  }
  const textures = root.listTextures().map((t) => {
    const size = t.getSize();
    return { mime: t.getMimeType(), size: size ? `${size[0]}×${size[1]}` : '?', bytes: t.getImage()?.byteLength ?? 0 };
  });
  return { triangles, drawCalls, materials: root.listMaterials().length, textures };
}

/** File size split into geometry and textures, so the effect of each step is visible. */
const sizes = (bytes, s) => {
  const textureBytes = s.textures.reduce((sum, t) => sum + t.bytes, 0);
  return { bytes, textureBytes, geometryBytes: bytes - textureBytes };
};

const original = await io.read(input);
const originalStats = stats(original);
const before = { file: path.basename(input), ...sizes(diskBytes(input), originalStats), ...originalStats };
fs.mkdirSync(outDir, { recursive: true });

const ktx2 = useKtx2 ? await import('@gltf-transform/cli') : null;
// toktx uses sharp to resize images before encoding them.
const encoder = useKtx2 ? (await import('sharp')).default : null;
const after = [];
for (const lod of LODS) {
  const doc = await io.read(input);
  await doc.transform(dedup(), prune(), flatten(), join(), weld());
  const current = stats(doc).triangles;
  if (current > lod.maxTriangles) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: lod.maxTriangles / current, error: lod.error }));
  }
  if (ktx2) {
    const resize = [lod.texture, lod.texture];
    // Colour and packed AO/roughness/metalness: small ETC1S. Normal maps: UASTC, which keeps detail.
    await doc.transform(
      ktx2.toktx({ encoder, mode: ktx2.Mode.UASTC, slots: /^normalTexture$/, resize }),
      ktx2.toktx({ encoder, mode: ktx2.Mode.ETC1S, slots: /^(?!normalTexture$).*/, resize }),
    );
  }
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = path.join(outDir, `cabinet-${lod.name}.glb`);
  await io.write(out, doc);
  const lodStats = stats(doc);
  after.push({ lod: lod.name, file: path.basename(out), ...sizes(diskBytes(out), lodStats), ...lodStats });
}

const report = { source: before, texturesCompressed: Boolean(ktx2), lods: after };
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
const line = (label, r, size) =>
  `${label} ${r.file}: ${size(r.bytes)} (geometry ${kb(r.geometryBytes)}, textures ${size(r.textureBytes)}), ` +
  `${r.triangles} triangles, ${r.drawCalls} draw calls, textures ${r.textures.map((t) => `${t.size} ${t.mime}`).join(', ') || 'none'}`;
console.log(line('Before', before, mb));
for (const a of after) console.log(line('After ', a, kb));
if (!ktx2) console.log('Textures were copied unchanged; run with --ktx2 (in CI) to resize and compress them.');
