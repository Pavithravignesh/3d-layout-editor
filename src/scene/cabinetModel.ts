import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import {
  BufferAttribute,
  Matrix4,
  type BufferGeometry,
  type CompressedTexture,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { getItemType } from '../domain/catalog';
import { useView, type ModelLoad } from '../state/viewStore';
import { fitToSize, rgbaBytesWithMips } from './modelFit';

const BASE = import.meta.env.BASE_URL;
/** Optimised by tools/optimise-model.mjs: Meshopt geometry and KTX2 textures. */
const OPTIMISED_URL = `${BASE}models/cabinet-lod0.glb`;
/** The Poly Haven source (4K JPEG textures), kept out of git; used only for the load comparison. */
const ORIGINAL_URL = `${BASE}models-original/utility_box_02_4k/utility_box_02_4k.gltf`;

export type CabinetModel = { geometry: BufferGeometry; material: MeshStandardMaterial };

let ktx2Loader: KTX2Loader | null = null;
function gltfLoader(gl: WebGLRenderer) {
  ktx2Loader ??= new KTX2Loader().setTranscoderPath(`${BASE}basis/`).detectSupport(gl);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2Loader);
}

/** Bytes downloaded for every request under `folder`, from the browser's resource timing. */
function bytesFetched(folder: string) {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes(folder))
    .reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).encodedBodySize || 0), 0);
}

function texturesOf(material: MeshStandardMaterial): Texture[] {
  const maps = [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.aoMap];
  return [...new Set(maps.filter((t): t is Texture => t !== null))];
}

/** GPU memory of a texture: compressed mip levels as stored, or RGBA8 plus mipmaps for images. */
function gpuBytes(texture: Texture) {
  const mipmaps = (texture as CompressedTexture).mipmaps as Array<{ data?: ArrayBufferView }> | undefined;
  if ((texture as CompressedTexture).isCompressedTexture && mipmaps) {
    return mipmaps.reduce((sum, level) => sum + (level.data?.byteLength ?? 0), 0);
  }
  const image = texture.image as { width?: number; height?: number } | undefined;
  return image?.width && image.height ? rgbaBytesWithMips(image.width, image.height) : 0;
}

/** Quantised (Meshopt) attributes are small integers; turn them into floats before scaling the model. */
function toFloatAttributes(geometry: BufferGeometry) {
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (attribute.array instanceof Float32Array && !attribute.normalized) continue;
    const floats = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i++) {
      for (let c = 0; c < attribute.itemSize; c++) floats[i * attribute.itemSize + c] = attribute.getComponent(i, c);
    }
    geometry.setAttribute(name, new BufferAttribute(floats, attribute.itemSize));
  }
}

/** Loads a model and times everything a user waits for: download, parse, transcode and GPU upload. */
async function loadTimed(gl: WebGLRenderer, url: string, folder: string) {
  const started = performance.now();
  const gltf = await gltfLoader(gl).loadAsync(url);
  let mesh: Mesh | undefined;
  gltf.scene.traverse((object) => {
    if (!mesh && (object as Mesh).isMesh) mesh = object as Mesh;
  });
  if (!mesh) throw new Error(`No mesh in ${url}`);
  const material = mesh.material as MeshStandardMaterial;
  const textures = texturesOf(material);
  for (const texture of textures) gl.initTexture(texture);
  const load: ModelLoad = {
    ms: Math.round(performance.now() - started),
    bytes: bytesFetched(folder),
    gpuBytes: textures.reduce((sum, texture) => sum + gpuBytes(texture), 0),
  };
  return { mesh, material, load };
}

let optimised: Promise<CabinetModel> | null = null;

function loadOptimised(gl: WebGLRenderer): Promise<CabinetModel> {
  optimised ??= loadTimed(gl, OPTIMISED_URL, '/models/').then(({ mesh, material, load }) => {
    useView.getState().recordLoad('optimised', load);
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry.clone();
    toFloatAttributes(geometry);
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const { scale, offset } = fitToSize(box.min.toArray(), box.max.toArray(), getItemType('cabinet').size);
    geometry.applyMatrix4(new Matrix4().makeTranslation(...offset).multiply(new Matrix4().makeScale(...scale)));
    geometry.computeBoundingSphere();
    return { geometry, material };
  });
  return optimised;
}

/** The optimised cabinet once it has loaded, or null while it loads (boxes are shown meanwhile). */
export function useCabinetModel(enabled: boolean): CabinetModel | null {
  const gl = useThree((s) => s.gl);
  const [model, setModel] = useState<CabinetModel | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadOptimised(gl).then((m) => live && setModel(m), (error) => console.error('Cabinet model failed to load', error));
    return () => {
      live = false;
    };
  }, [enabled, gl]);
  return enabled ? model : null;
}

/** Inside the canvas: loads the 25.8 MB original once when asked, for the before/after load time. */
export function OriginalLoadProbe() {
  const gl = useThree((s) => s.gl);
  const requested = useView((s) => s.originalRequested);
  useEffect(() => {
    if (!requested) return;
    loadTimed(gl, ORIGINAL_URL, '/models-original/').then(
      ({ material, load }) => {
        useView.getState().recordLoad('original', load);
        texturesOf(material).forEach((texture) => texture.dispose());
      },
      () => useView.getState().markOriginalMissing(),
    );
  }, [requested, gl]);
  return null;
}
