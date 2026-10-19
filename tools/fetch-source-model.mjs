// Downloads the heavy source model (Poly Haven "Utility Box 02", 4K, CC0) for the optimisation
// pipeline and the before/after load comparison. Both copies are kept out of git.
//
// Usage: node tools/fetch-source-model.mjs
import fs from 'node:fs';
import path from 'node:path';

const ASSET = 'utility_box_02';
const TARGETS = [`models-source/${ASSET}_4k`, `public/models-original/${ASSET}_4k`];

const files = await (await fetch(`https://api.polyhaven.com/files/${ASSET}`)).json();
const gltf = files.gltf['4k'].gltf;
const downloads = [[`${ASSET}_4k.gltf`, gltf.url], ...Object.entries(gltf.include).map(([name, info]) => [name, info.url])];

for (const [name, url] of downloads) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  for (const target of TARGETS) {
    const file = path.join(target, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }
  console.log(`${name}: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`Saved to ${TARGETS.join(' and ')}`);
