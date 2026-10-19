import { create } from 'zustand';

/** Which glTF version of the cabinet model is drawn. */
export type ModelKind = 'original' | 'optimised';

/** How cabinets are drawn: the three-box primitive, or one of the two cabinet models. */
export type ItemLook = 'boxes' | ModelKind;

/** One measured model load: download, parse, KTX2 transcode and GPU upload. */
export type ModelLoad = { ms: number; bytes: number; gpuBytes: number };

type ViewState = {
  look: ItemLook;
  /** Off draws every item as its own meshes, to show what instancing saves. */
  instancing: boolean;
  loads: Partial<Record<ModelKind, ModelLoad>>;
  /** The original is kept out of git; true when it is not on this machine. */
  originalMissing: boolean;
  setLook(look: ItemLook): void;
  setInstancing(on: boolean): void;
  recordLoad(kind: ModelKind, load: ModelLoad): void;
  markOriginalMissing(): void;
};

/**
 * Display settings for the performance comparison. Kept apart from the layout store: they are
 * not edits, so they never enter undo history. Free of three.js imports, like the perf store.
 */
export const useView = create<ViewState>()((set) => ({
  look: 'boxes',
  instancing: true,
  loads: {},
  originalMissing: false,
  setLook: (look) => set({ look }),
  setInstancing: (instancing) => set({ instancing }),
  recordLoad: (kind, load) => set((s) => ({ loads: { ...s.loads, [kind]: load } })),
  markOriginalMissing: () => set({ originalMissing: true, look: 'boxes' }),
}));
