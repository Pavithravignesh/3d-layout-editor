# 3D Layout Editor

[![CI](https://github.com/Pavithravignesh/3d-layout-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/Pavithravignesh/3d-layout-editor/actions/workflows/ci.yml)

A browser-based editor for placing electrical equipment on a 20 m × 12 m room floor. Place, move, rotate and delete items on a 0.5 m grid, undo any edit, see clearance violations as you work, and read a live bill of materials in English or Vietnamese.

Built with React 18, TypeScript (strict), three.js via React Three Fiber, and Zustand.

## Run it

Requires **Node.js 20+**.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

<details>
<summary>On a locked-down Windows machine where native binaries are blocked</summary>

Some corporate laptops use Windows Application Control, which blocks the native `esbuild` and `rollup` binaries that Vite downloads. The `:office` scripts run the same tools through their official WebAssembly builds instead (installed with `--no-save`, so `package.json` and the lockfile are unchanged):

```bash
npm install --ignore-scripts
npm run dev:office      # or build:office / preview:office / test:office
```

They are slower than the native tools and are not needed on a normal machine.
</details>

## Using the editor

| Action | How |
| --- | --- |
| Place an item | Choose it under **Equipment**, then click the floor. **Shift**-click to place several; **Esc** cancels |
| Select | Click an item in 3D or in **Placed items**; the selection is shared |
| Select several | **Ctrl**-click (or **Shift**-click in 3D) to add or remove items; **Shift**-click in the list selects a range; **Ctrl+A** selects all |
| Move | Drag the item; it snaps to the 0.5 m grid. Or press the **arrow keys** to move the selection one cell (0.5 m), **Shift + arrow** for 1 m. Or type a position in **Properties**. A selected group moves together and stops as a unit at the floor's edge |
| Rotate | **R**, the **Rotate 90°** button, or the rotation field; with several selected, each item turns in place |
| Delete | **Delete** or the **Delete** button; removes the whole selection |
| Copy and paste | **Ctrl+C**, **Ctrl+X**, **Ctrl+V**. Pasted copies land one cell down-right (repeated pastes cascade), get the next labels and become the selection |
| Undo / redo | **Ctrl+Z** / **Ctrl+Y** (or **Ctrl+Shift+Z**). The toolbar tooltip names the step, e.g. "Undo move D-01" |
| Browse the list | Tab into **Placed items**, then ↑ / ↓ / Home / End |
| Camera | Drag to orbit, right-drag to pan, scroll to zoom |
| Language | **EN / VI** in the top bar; numbers follow the locale (0.5 m → 0,5 m) |
| Performance test | **Add 500 test items** in the top bar; each click adds 500 more in new positions (one undo step removes a batch) |
| Model and instancing comparison | At the top right of the 3D view: **Boxes / Model** draws cabinets with the optimised glTF model; **Instancing: On / Off** draws every item as its own mesh. With **Model** on, the bottom-left panel shows the model's download size, GPU texture memory and load time, and loads the 25.8 MB original for comparison |

## What is in it

| Requirement | Implementation |
| --- | --- |
| 20 × 12 m floor, 0.5 m cells, three item types | Floor with a 0.5 m grid and 1 m major lines; control cabinet, variable-speed drive, transformer |
| Place with snapping; select, move, rotate, delete | The north-west corner of every footprint snaps to a grid line and stays on the floor, including after a 90° rotation |
| Undo and redo for every edit | Command pattern: each edit records how to revert itself exactly. A drag is one step, not one per pixel |
| List and properties in sync with the 3D view | One store owns the layout and the selection; the 3D view, the list and the properties panel all read from it |
| Items closer than 0.6 m highlighted, with a message naming both | Edge-to-edge distance between footprints. Items turn red in 3D and in the list, and the **Rule check** panel says, for example, "C-01 and D-01 are 0.54 m apart". The check also runs live while dragging and while placing |
| Bill of materials with English / Vietnamese | Counted from the scene; the whole interface switches language |

**Plus items built**

| Plus item | Implementation |
| --- | --- |
| 3D model optimisation | A 25.8 MB glTF cabinet goes through `tools/optimise-model.mjs` (simplify, Meshopt, KTX2) to **496 KB**, with three levels of detail. In the editor it is drawn with instancing: **13 draw calls instead of 1,058** for 500 items. Details and numbers in [3D model optimisation](#3d-model-optimisation) |
| Editing depth: multi-select, copy and paste | Selection is a list with a primary item. Group move, rotate, delete, cut and paste are each **one batch command**, so a single Ctrl+Z reverts them. Moves are clamped for the group as a whole. The properties panel shows the group's make-up, clearance issues and group actions |
| Keyboard editing | Select (list and Ctrl+A), move one cell (arrow keys), delete and every other edit from the keyboard, with screen-reader announcements of the result |

## How it is built

```
src/
├── domain/          Pure TypeScript, no React or three.js: catalogue, geometry and snapping,
│                    commands and undo history, clearance rule, group moves and paste,
│                    bill of materials (unit-tested)
├── state/           Zustand store: the layout document, selection, clipboard and placing mode
├── scene/           React Three Fiber: floor, instanced items, selection marker, placement preview
├── ui/              Panels: palette, item list, properties, rule check, bill of materials, top bar
├── design-system/   Design tokens (CSS variables), Button, Panel, Icon, Segmented
├── i18n/            i18next with English and Vietnamese; Intl number formatting
└── app/             Layout, keyboard shortcuts, error boundary
tools/               Model pipeline (optimise-model.mjs, fetch-source-model.mjs) and the push script
```

**Edit model.** Every change is a `Command` with `apply` and `revert`. The history keeps the last 200 steps; a new edit clears the redo stack. Because the 3D view, the panels and the keyboard all call the same store actions, undo works the same no matter where an edit came from. Drags and placement previews live in local component state and are committed once, on release.

**Clearance rule.** A naive check compares every pair (n²: about 125,000 pairs at 500 items). The rule uses a spatial hash with cells larger than any item plus the clearance, so each item is only compared with items in its own and neighbouring cells. A unit test checks it against the brute-force result on 400 random items.

**Rendering.** Items are drawn with one `InstancedMesh` per part (body, plinth, front panel) per type: **9 draw calls for the items whatever their number**. Per-instance colours show violations. The 3D view is loaded lazily, so the panels are usable before three.js has downloaded.

**Keyboard editing and accessibility.** Every edit works from the keyboard: select with the item list (one Tab stop, ↑ / ↓ / Home / End), move one cell with the arrow keys (Shift for 1 m), rotate with **R**, delete with **Delete**, undo and redo with **Ctrl+Z / Ctrl+Y**. A polite live region announces each edit with the result, for example "Done: move C-01. Now at 5, 2.5 m. Too close to D-01 (0.2 m)." Focus is always visible, and status is shown with text and icons as well as colour.

**Item models.** By default the equipment is drawn from simple box primitives (body, plinth and a front panel that shows orientation). The Khronos glTF sample models, Poly Haven, Kenney, Quaternius, Poly Pizza and Sketchfab were searched for free models: none has a variable-speed drive or a transformer, and the closest cabinet is an outdoor utility box. That box is used to show the optimisation pipeline (**Model** switch, cabinets only); boxes stay the default because they match every catalogue footprint exactly.

## Performance

Measured with **Add 500 test items** (a fixed, repeatable layout: 224 cabinets, 195 drives, 81 transformers).

| Metric | Result |
| --- | --- |
| **Frame rate, 500 items** | **60 fps (16.6 ms per frame)**, the display's full refresh rate, on a Lenovo 82TS laptop: Intel Core i7-1255U, **Intel Iris Xe integrated graphics**, 16 GB RAM, Windows 11, Chrome 155, full screen at 1920 × 1080 @ 60 Hz, production build, measured while orbiting the camera for over 10 seconds. The empty scene also runs at 60 fps, so 500 items cost no measurable frame time at this refresh rate |
| **Frame rate, 2,500 items** | **59 fps (17.1 ms per frame)**: five clicks of **Add 500 test items**, same laptop and setup. Above the brief's 2,000-item scene and its 50 fps budget |
| Draw calls, 500 items | 15 (9 for all items + floor, grid and walls) |
| Draw calls, 2,500 items | Still 15; 19 while an item is selected (its outline and clearance zone add 4) |
| Generating 500 items | about 35 ms, one undo step |
| First download (panels usable) | ≈ 34 KB gzipped JavaScript + 3 KB CSS |
| 3D code, loaded after | ≈ 282 KB gzipped (three.js, React Three Fiber) |

How to measure: run `npm run build && npm run preview`, open the app full-screen, click **Add 500 test items**, orbit the camera for a few seconds, and read the live **fps / ms / draw calls** readout in the top bar (it ignores samples from a hidden tab).

## 3D model optimisation

**Source model:** [Utility Box 02](https://polyhaven.com/a/utility_box_02) by James Ray Cock, Poly Haven, licence **CC0**. The 4K glTF: 25.8 MB, 6,268 triangles, three 4096 × 4096 JPEG textures (colour, normal, ambient occlusion / roughness / metalness).

**Pipeline** (`tools/optimise-model.mjs`, the steps of Section 9.1 of the design document): dedup, prune, flatten, join and weld; Meshopt simplification into three levels of detail; textures fitted to 1024 px (normal map 512 px, far level 256 px) and encoded to KTX2 (ETC1S for colour and the packed map, UASTC with RDO and Zstandard for the normal map); Meshopt compression of the geometry. Everything runs through WebAssembly (meshoptimizer, Basis Universal) or plain JavaScript, so no native tools are needed, and the output is the same on every run.

| | Before | After (near level, used in the editor) |
| --- | --- | --- |
| File size | **25.8 MB** | **496 KB** (−98%) |
| Geometry | 198 KB | 67 KB |
| Textures | 25.6 MB, three 4096² JPEG | 428 KB KTX2: 1024² colour, 1024² packed map, 512² normal map |
| Triangles | 6,268 | 6,268 near · 2,500 mid (462 KB) · 499 far (80 KB) |
| Draw calls per model | 1 | 1 |
| Texture memory on the GPU | 256 MB (RGBA with mipmaps) | **3 MB** (stays compressed) |
| Ready to draw (download, parse, transcode, GPU upload) | 962 ms | **432 ms**, including the one-off start of the KTX2 decoder |
| Download on the brief's 10 Mbps VPN | ≈ 21 s | **≈ 0.4 s** |

Load times were measured in Chrome from `localhost` on the laptop in the table above (first load), so they show the cost of decoding and uploading; the 10 Mbps line adds the network time the brief describes.

**Instancing** (500 items, measured with the switches in the 3D view):

| | Instancing on | Instancing off |
| --- | --- | --- |
| Boxes (three parts per item) | **15 draw calls** | 1,506 draw calls |
| Cabinets as the glTF model | **13 draw calls** | 1,058 draw calls |

With instancing, draw calls depend on the number of different models and parts, not on the number of items.

**Frame time** (orbiting the camera, same laptop, Chrome, 1080p):

| Scene | Instancing on | Instancing off |
| --- | --- | --- |
| 500 items, cabinets as the glTF model | **56–60 fps** (16.6–17.9 ms), 13 draw calls | 60 fps (16.7 ms), 1,058 draw calls |
| 2,500 items, boxes | **60 fps (16.7 ms)**, 15 draw calls | **35 fps (28.7 ms)**, 7,515 draw calls |

At 500 items this laptop absorbs about 1,500 draw calls within a 60 Hz frame. At 2,500 items, drawing each item on its own breaks the brief's budget (50 fps, under 300 draw calls); with instancing the scene stays at the display's 60 fps with 15 draw calls.

**Reproduce:**

```bash
npm run model:fetch
```

```bash
npm run model:optimise
```

The first command downloads the source model (it is kept out of git); the second writes the three levels and `report.json` to `models-source/out/`. `docs/model-optimisation/` holds the committed results.

**Limits, stated plainly:** the source is an outdoor utility box (0.92 × 0.43 × 1.12 m), stretched to the cabinet's catalogue size (0.8 × 0.6 × 2.0 m) so snapping and the 0.6 m rule stay exact. Only the near level is used in the editor; switching levels by distance is described in the design document but not built here.

## Tests

```bash
npm test
```

49 unit tests cover snapping and rotation (only quarter turns accepted from input), the clearance rule (including the brute-force comparison and the exactly-0.6 m boundary), undo/redo (exact restore of position and list order, redo cleared by a new edit, history limit, batches), keyboard nudging (one cell per step, nothing recorded at the floor's edge), multi-select (toggle, range, select all), group moves clamped as a unit, group delete and its undo, copy, cut and cascading paste, labels, the bill of materials, the performance test layout (each batch adds new items with unique ids), and fitting a model to its catalogue size.

## Trade-offs and next steps

- **Overlaps are allowed but flagged**, rather than blocked: blocking would make dense layouts frustrating to edit, and the rule panel already makes every conflict visible.
- **The violation list shows the closest 50** with a count of the rest; a 500-item random layout produces thousands of pairs, and listing them all would add nothing.
- **Rotation is in 90° steps** so footprints stay aligned with the grid.
- Natural next steps: models for the drive and the transformer, switching levels of detail by distance, align and distribute, a 2D plan view, box selection, embedding in a host page over `postMessage`, and an assistant that proposes layout fixes as a preview.

## Use of AI tools

This project was built with **Claude Code** (Anthropic's coding assistant, Claude Opus model) as a pair programmer, working step by step: agreeing the plan and defaults, then building and verifying one step at a time (scaffold, edit model and tests, 3D interaction, panels, performance, polish). The assistant wrote code and tests, ran type-checks, lint, tests and builds, and checked behaviour in a browser after each step; I reviewed each step, made the product and design decisions, and own the result. I can explain and change any part of the code.
