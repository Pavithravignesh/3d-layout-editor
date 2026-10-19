# 3D Layout Editor

[![CI](https://github.com/Pavithravignesh/3d-layout-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/Pavithravignesh/3d-layout-editor/actions/workflows/ci.yml)

A browser-based editor for placing electrical equipment on a 20 m × 12 m room floor. Place, move, rotate and delete items on a 0.5 m grid, undo any edit, see clearance violations as you work, and read a live bill of materials in English or Vietnamese.

Built with React 18, TypeScript (strict), three.js via React Three Fiber, and Zustand. This is Part B of the assessment; the architecture design document (Part A) is sent separately as a PDF.

**Live demo:** https://3d-layout-editor.vercel.app (deployed from `main`)

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
| Display switches | **Boxes / Original / Optimised** and **Instancing: On / Off** at the top right of the 3D view; see [Display switches](#display-switches-boxes--original--optimised-and-instancing-on--off) |

### Keyboard shortcuts

Shortcuts work whenever the cursor is not in a text field. On a Mac, use Cmd instead of Ctrl.

| Keys | What they do |
| --- | --- |
| **Ctrl+Z** | Undo the last edit |
| **Ctrl+Y** or **Ctrl+Shift+Z** | Redo |
| **← → ↑ ↓** | Move the selection one cell (0.5 m); with **Shift**, 1 m |
| **R** | Rotate the selection 90° (each item turns in place) |
| **Delete** or **Backspace** | Delete the selection |
| **Ctrl+A** | Select every item |
| **Ctrl+C** / **Ctrl+X** / **Ctrl+V** | Copy / cut / paste the selection |
| **Esc** | Stop placing, or clear the selection |
| **Tab** into **Placed items**, then **↑ ↓ Home End** | Move through the list; the selected item is highlighted in 3D too |

Every keyboard edit is announced to screen readers, for example "Done: move C-01. Now at 5, 2.5 m. Too close to D-01 (0.2 m)."

### Editing depth: working with several items

1. **Select several items.** In the 3D view, **Ctrl-click** (or **Shift-click**) items to add or remove them. In **Placed items**, **Ctrl-click** adds an item and **Shift-click** selects a range. **Ctrl+A** selects everything.
2. **Edit them together.** Drag any selected item and the whole group moves; it stops as a unit at the floor's edge. The arrow keys move the group, **R** turns each item in place, and **Delete** removes them all. The **Properties** panel shows the group: how many of each type, any clearance problems, and buttons to rotate, copy or delete them.
3. **Copy and paste.** **Ctrl+C**, then **Ctrl+V**: the copies appear one cell down and to the right, get the next free labels (C-04, D-02…) and become the selection, so you can drag them straight away. Pasting again places another set a further cell away. **Ctrl+X** cuts.
4. **Undo.** Each group action, including a paste, is one step: a single **Ctrl+Z** reverts all of it.

### Display switches: Boxes / Original / Optimised and Instancing On / Off

Two switches at the **top right of the 3D view** change only how the scene is drawn. They never change the layout and are not part of undo.

| Switch | What it means | When to use it |
| --- | --- | --- |
| **Boxes** (default) | Every item is drawn as simple boxes at its exact catalogue size | Normal editing |
| **Original** | Control cabinets are drawn with the unoptimised source model (25.8 MB, 4K textures). Drives and transformers stay boxes. Needs `npm run model:fetch` first, as the source is not in git | The "before" side: its load time and frame time |
| **Optimised** | Control cabinets are drawn with the optimised model (496 KB, KTX2 textures) | The "after" side. The panel at the bottom left lists the download size, GPU texture memory and load time of each model loaded so far |
| **Instancing: On** (default) | All items of the same kind are drawn together, one draw call per part per type: 15 draw calls for the boxes whatever the number of items | Normal editing |
| **Off** | Every item is drawn on its own, so draw calls grow with the number of items | To see why instancing matters: 2,500 items fall from 60 fps (15 draw calls) to 35 fps (7,515 draw calls) |

Selecting, dragging and undo work the same with every combination of the switches.

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
| 3D model optimisation | A 25.8 MB glTF cabinet goes through `tools/optimise-model.mjs` (simplify, Meshopt, KTX2) to **496 KB**, with three levels of detail. In the editor it is drawn with instancing: **13 draw calls instead of 1,058** for 500 items, At 2,000 items instancing keeps 60 fps where drawing items one by one falls to about 40 fps, and at 2,500 items the optimised model runs at about **52 fps against 46 fps** for the original. Details and numbers in [3D model optimisation](#3d-model-optimisation) |
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

**Item models.** By default the equipment is drawn from simple box primitives (body, plinth and a front panel that shows orientation). The Khronos glTF sample models, Poly Haven, Kenney, Quaternius, Poly Pizza and Sketchfab were searched for free models: none has a variable-speed drive or a transformer, and the closest cabinet is an outdoor utility box. That box is used to show the optimisation pipeline (**Original / Optimised** switch, cabinets only); boxes stay the default because they match every catalogue footprint exactly.

## Performance

Measured with **Add 500 test items** (a fixed, repeatable layout: 224 cabinets, 195 drives, 81 transformers).

| Metric | Result |
| --- | --- |
| **Frame rate, 500 items** | **60 fps (16.6 ms per frame)**, the display's full refresh rate, on a Lenovo 82TS laptop: Intel Core i7-1255U, **Intel Iris Xe integrated graphics**, 16 GB RAM, Windows 11, Chrome 155, full screen at 1920 × 1080 @ 60 Hz, production build, measured while orbiting the camera for over 10 seconds. The empty scene also runs at 60 fps, so 500 items cost no measurable frame time at this refresh rate |
| **Frame rate, 2,500 items** | **59 fps (17.1 ms per frame)**: five clicks of **Add 500 test items**, same laptop and setup. Above the brief's 2,000-item scene and its 50 fps budget |
| Draw calls, 500 items | 15 (9 for all items + floor, grid and walls) |
| Draw calls, 2,500 items | Still 15; 19 while an item is selected (its outline and clearance zone add 4) |
| Browser memory, 2,000 items | Editor tab **175 MB**; Chrome's GPU process 733 MB, shared with the other open tabs, so an upper bound. Together under the brief's 1 GB budget |
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
| Ready to draw (download, parse, transcode, GPU upload) | 685–1,557 ms | **242–432 ms**, including the one-off start of the KTX2 decoder |
| Download on the brief's 10 Mbps VPN | ≈ 21 s | **≈ 0.4 s** |
| Frame time, 500 items | 60 fps (16.6 ms) | 60 fps (16.7 ms) |
| Frame time, 2,000 items (the brief's largest scene) | 59 fps (17 ms) | 60 fps (16.7 ms) |
| **Frame time, 2,500 items** | **42–51 fps, average ≈ 46 (≈ 21.7 ms)** | **48–56 fps, average ≈ 52 (≈ 19.2 ms)** |

Load times were measured in Chrome from `localhost` on the laptop in the table above (first load, two sessions), so they show the cost of decoding and uploading; the 10 Mbps line adds the network time the brief describes. Frame times were read from the top bar with the same camera view and the same items, switching only between **Original** and **Optimised**, instancing on. Both versions have the same triangles and one draw call. Up to the brief's 2,000 items this laptop draws even the original at about 60 fps; beyond that the textures (256 MB versus 3 MB on the GPU) start to cost frame time, and at 2,500 items the optimised model keeps the scene within the brief's 50 fps budget where the original falls below it. On weaker GPUs, and with the 40 distinct models a real room uses, that texture memory matters sooner.

**Instancing** (500 items, measured with the switches in the 3D view):

| | Instancing on | Instancing off |
| --- | --- | --- |
| Boxes (three parts per item) | **15 draw calls** | 1,506 draw calls |
| Cabinets as the glTF model | **13 draw calls** | 1,058 draw calls |

With instancing, draw calls depend on the number of different models and parts, not on the number of items.

**Frame time with and without instancing** (orbiting the camera, same laptop, Chrome, 1080p):

| Scene | Instancing on | Instancing off |
| --- | --- | --- |
| 500 items, cabinets as the glTF model | **56–60 fps** (16.6–17.9 ms), 13 draw calls | 60 fps (16.7 ms), 1,058 draw calls |
| 2,000 items, boxes (the brief's largest scene) | **60 fps (16.7 ms)**, 15 draw calls | **25–52 fps, average ≈ 40 (≈ 25 ms)**, 6,006 draw calls |
| 2,500 items, boxes | **60 fps (16.7 ms)**, 15 draw calls | **35 fps (28.7 ms)**, 7,515 draw calls |

At 500 items this laptop absorbs about 1,500 draw calls within a 60 Hz frame. At the brief's 2,000 items, drawing each item on its own breaks its budget (50 fps, under 300 draw calls); with instancing the scene stays at the display's 60 fps with 15 draw calls.

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

### The tool

I used **Claude Code** (Anthropic, Claude Opus model) in the Claude desktop app for the whole assessment, as an agent rather than a chat window. With my approval it read and edited files, ran commands (type-check, lint, tests, builds, the model pipeline), opened the editor in a built-in browser to check it, worked with GitHub (branches, pull requests, CI, merges) and kept notes between sessions on decisions and progress. It is one assistant working step by step; I did not use multi-agent workflows.

### Who did what

| Work | Me | Claude Code |
| --- | --- | --- |
| Decisions: architecture, stack, scope, which plus items, trade-offs | ✔ made them | Proposed options with costs |
| Part B code and tests | Reviewed each step | Wrote them, ran the checks |
| Part A design document, diagrams, wireframes | Set the decisions, reviewed and corrected every section | Drafted from my decisions, generated the editable diagrams and wireframes |
| Model optimisation pipeline | Chose the model and the approach | Searched for free models, wrote the pipeline |
| Testing by hand in Chrome (select, drag, undo, keyboard, switches) | ✔ every feature | — |
| All measurements: frame rate, draw calls, load time, memory | ✔ on my laptop | Explained how to measure, recorded the results |

### The workflow

1. **Understand first.** Before deciding anything I asked for plain-language explanations of the brief and of each design point.
2. **Plan and approve.** The assistant stated a plan with options, time and risks; nothing was built until I chose.
3. **Build in isolation.** Larger features were built on a separate branch and folder and pushed only when I said so.
4. **Check automatically.** Type-check, lint, the unit tests and a production build after every change; CI runs the same on every pull request.
5. **Check by hand.** I tested each feature in Chrome and measured every number in this README myself.
6. **Audit against the brief.** I had the work compared with the brief word by word, more than once, and fixed what was missing.
7. **Ship safely.** Pull request, green CI, merge, and the live demo redeploys from `main`.

### Example prompts

The kind of instructions I gave, close to how I wrote them:

- "Before starting, tell me your plan and ask me questions."
- "Explain this point in plain language, and tell me how the project covers it."
- "Check all eight wireframe screens for inconsistencies before fixing anything."
- "Go through the brief again, word by word: is anything missing or wrong?"
- "Why did you miss this?" (when a requirement turned out to be missing, I asked for the cause and a better check, not just a fix)
- "Build it on a separate branch and test it locally; don't push until I tell you."
- "Tell me exactly how to test this in Chrome, step by step." (then I measured the results myself)
- "Use only black text in the PDF and keep the front page simple."

### What the assistant got wrong, and how it was caught

- **Missing design topics.** The first design document did not explain the role-based home page or wiring, both named in the brief's scenario. My review against the brief found them; the sections were added.
- **Wrong comparison.** "Frame time before and after" was first answered with instancing on and off, not the original model against the optimised one. Re-reading the brief caught it; the **Original / Optimised** switch was added and I re-measured.
- **A silent failure.** In CI, a texture encoder version mismatch skipped every texture while the run still passed. The pipeline now fails if any texture is not converted.
- **A real bug.** Clicking **Add 500 test items** twice reused item ids; a unit test now covers it.

### In the design review

I can explain and change any part of the code or the design, walk through any of the steps above, and repeat any measurement live.
