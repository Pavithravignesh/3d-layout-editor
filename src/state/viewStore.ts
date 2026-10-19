import { create } from 'zustand';

/** How cabinets are drawn: the three-box primitive, or the optimised glTF model. */
export type ItemLook = 'boxes' | 'model';

/** One measured model load: download, parse, KTX2 transcode and GPU upload. */
export type ModelLoad = { ms: number; bytes: number; gpuBytes: number };

type ViewState = {
  look: ItemLook;
  /** Off draws every item as its own meshes, to show what instancing saves. */
  instancing: boolean;
  optimisedLoad: ModelLoad | null;
  originalLoad: ModelLoad | null;
  /** Set once to load the heavy original model for the before/after comparison. */
  originalRequested: boolean;
  /** The original is kept out of git; true when it is not on this machine. */
  originalMissing: boolean;
  setLook(look: ItemLook): void;
  setInstancing(on: boolean): void;
  requestOriginalLoad(): void;
  recordLoad(which: 'optimised' | 'original', load: ModelLoad): void;
  markOriginalMissing(): void;
};

/**
 * Display settings for the performance comparison. Kept apart from the layout store: they are
 * not edits, so they never enter undo history. Free of three.js imports, like the perf store.
 */
export const useView = create<ViewState>()((set) => ({
  look: 'boxes',
  instancing: true,
  optimisedLoad: null,
  originalLoad: null,
  originalRequested: false,
  originalMissing: false,
  setLook: (look) => set({ look }),
  setInstancing: (instancing) => set({ instancing }),
  requestOriginalLoad: () => set({ originalRequested: true }),
  recordLoad: (which, load) => set(which === 'optimised' ? { optimisedLoad: load } : { originalLoad: load }),
  markOriginalMissing: () => set({ originalMissing: true }),
}));
