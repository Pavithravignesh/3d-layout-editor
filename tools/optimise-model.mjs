// Optimises one heavy glTF model the way Section 9.1 of the design document describes, and
// reports before and after: file size (geometry and textures), triangles and draw calls.
//
// Usage: node tools/optimise-model.mjs <input.gltf> <outDir> [--no-ktx2]
// Everything runs in Node through WebAssembly (meshoptimizer, Basis Universal) or plain
// JavaScript (jpeg-js), so no native tools are needed. --no-ktx2 keeps textures unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import jpeg from 'jpeg-js';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const useKtx2 = !process.argv.includes('--no-ktx2');
if (!input || !outDir) {
  console.error('Usage: node tools/optimise-model.mjs <input.gltf> <outDir> [--no-ktx2]');
  process.exit(1);
}

/** Levels of detail with their triangle budgets (Section 9.2) and largest texture side. */
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

/**
 * Decodes a JPEG and shrinks it by averaging whole blocks of pixels until it fits in `maxSide`.
 * Plain JavaScript, so it runs where native image libraries are blocked.
 */
const decodeAndFit = (maxSide) => async (buffer) => {
  const src = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  const k = Math.max(1, Math.ceil(Math.max(src.width, src.height) / maxSide));
  const width = Math.floor(src.width / k);
  const height = Math.floor(src.height / k);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dy = 0; dy < k; dy++) {
          const row = (y * k + dy) * src.width;
          for (let dx = 0; dx < k; dx++) sum += src.data[(row + x * k + dx) * 4 + c];
        }
        data[(y * width + x) * 4 + c] = Math.round(sum / (k * k));
      }
    }
  }
  return { width, height, data };
};

/** Basis Universal settings per texture slot: small ETC1S for colour and packed maps, UASTC for normals. */
/** Normal maps stop at 512 px: finer bumps are invisible on a 2 m cabinet at editing distance. */
const NORMAL_MAX_SIDE = 512;

function textureTransforms(maxSide) {
  const imageDecoder = decodeAndFit(maxSide);
  const shared = { imageDecoder, generateMipmap: true, isKTX2File: true };
  const normalDecoder = decodeAndFit(Math.min(maxSide, NORMAL_MAX_SIDE));
  return [
    ktx2({ ...shared, slots: /^baseColorTexture$/, isUASTC: false, qualityLevel: 128, isPerceptual: true, isSetKTX2SRGBTransferFunc: true }),
    ktx2({ ...shared, slots: /^(occlusion|metallicRoughness)Texture$/, isUASTC: false, qualityLevel: 128, isPerceptual: false }),
    ktx2({ ...shared, imageDecoder: normalDecoder, slots: /^normalTexture$/, isUASTC: true, isNormalMap: true, isPerceptual: false, needSupercompression: true, enableRDO: true, rdoQualityLevel: 3 }),
  ];
}

const original = await io.read(input);
const originalStats = stats(original);
const before = { file: path.basename(input), ...sizes(diskBytes(input), originalStats), ...originalStats };
fs.mkdirSync(outDir, { recursive: true });

const after = [];
for (const lod of LODS) {
  const started = Date.now();
  const doc = await io.read(input);
  await doc.transform(dedup(), prune(), flatten(), join(), weld());
  const current = stats(doc).triangles;
  if (current > lod.maxTriangles) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: lod.maxTriangles / current, error: lod.error }));
  }
  if (useKtx2) {
    await doc.transform(...textureTransforms(lod.texture));
    const missed = doc.getRoot().listTextures().filter((t) => t.getMimeType() !== 'image/ktx2');
    if (missed.length) throw new Error(`${lod.name}: ${missed.length} texture(s) were not converted to KTX2`);
  }
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = path.join(outDir, `cabinet-${lod.name}.glb`);
  await io.write(out, doc);
  const lodStats = stats(doc);
  after.push({ lod: lod.name, file: path.basename(out), ...sizes(diskBytes(out), lodStats), ...lodStats });
  console.log(`  ${lod.name} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

const report = { source: before, texturesCompressed: useKtx2, lods: after };
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
const line = (label, r, size) =>
  `${label} ${r.file}: ${size(r.bytes)} (geometry ${kb(r.geometryBytes)}, textures ${size(r.textureBytes)}), ` +
  `${r.triangles} triangles, ${r.drawCalls} draw calls, textures ${r.textures.map((t) => `${t.size} ${t.mime}`).join(', ') || 'none'}`;
console.log(line('Before', before, mb));
for (const a of after) console.log(line('After ', a, kb));
if (!useKtx2) console.log('Textures were left unchanged (--no-ktx2).');
