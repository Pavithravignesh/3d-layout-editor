# 3D Layout Editor

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
| Performance test | **Add 500 test items** in the top bar (one undo step removes them) |

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
├── design-system/   Design tokens (CSS variables), Button, Panel, Icon
├── i18n/            i18next with English and Vietnamese; Intl number formatting
└── app/             Layout, keyboard shortcuts, error boundary
```

**Edit model.** Every change is a `Command` with `apply` and `revert`. The history keeps the last 200 steps; a new edit clears the redo stack. Because the 3D view, the panels and the keyboard all call the same store actions, undo works the same no matter where an edit came from. Drags and placement previews live in local component state and are committed once, on release.

**Clearance rule.** A naive check compares every pair (n²: about 125,000 pairs at 500 items). The rule uses a spatial hash with cells larger than any item plus the clearance, so each item is only compared with items in its own and neighbouring cells. A unit test checks it against the brute-force result on 400 random items.

**Rendering.** Items are drawn with one `InstancedMesh` per part (body, plinth, front panel) per type: **9 draw calls for the items whatever their number**. Per-instance colours show violations. The 3D view is loaded lazily, so the panels are usable before three.js has downloaded.

**Keyboard editing and accessibility.** Every edit works from the keyboard: select with the item list (one Tab stop, ↑ / ↓ / Home / End), move one cell with the arrow keys (Shift for 1 m), rotate with **R**, delete with **Delete**, undo and redo with **Ctrl+Z / Ctrl+Y**. A polite live region announces each edit with the result, for example "Done: move C-01. Now at 5, 2.5 m. Too close to D-01 (0.2 m)." Focus is always visible, and status is shown with text and icons as well as colour.

**Item models.** The equipment is drawn from simple box primitives (body, plinth and a front panel that shows orientation); no external models or textures are used.

## Performance

Measured with **Add 500 test items** (a fixed, repeatable layout: 224 cabinets, 195 drives, 81 transformers).

| Metric | Result |
| --- | --- |
| **Frame rate, 500 items** | **60 fps (16.6 ms per frame)**, the display's full refresh rate, on a Lenovo 82TS laptop: Intel Core i7-1255U, **Intel Iris Xe integrated graphics**, 16 GB RAM, Windows 11, Chrome 155, full screen at 1920 × 1080 @ 60 Hz, production build, measured while orbiting the camera for over 10 seconds. The empty scene also runs at 60 fps, so 500 items cost no measurable frame time at this refresh rate |
| Draw calls, 500 items | 15 (9 for all items + floor, grid and walls) |
| Generating 500 items | about 35 ms, one undo step |
| First download (panels usable) | ≈ 34 KB gzipped JavaScript + 3 KB CSS |
| 3D code, loaded after | ≈ 282 KB gzipped (three.js, React Three Fiber) |

How to measure: run `npm run build && npm run preview`, open the app full-screen, click **Add 500 test items**, orbit the camera for a few seconds, and read the live **fps / ms / draw calls** readout in the top bar (it ignores samples from a hidden tab).

## Tests

```bash
npm test
```

44 unit tests cover snapping and rotation, the clearance rule (including the brute-force comparison and the exactly-0.6 m boundary), undo/redo (exact restore of position and list order, redo cleared by a new edit, history limit, batches), keyboard nudging (one cell per step, nothing recorded at the floor's edge), multi-select (toggle, range, select all), group moves clamped as a unit, group delete and its undo, copy, cut and cascading paste, labels and the bill of materials.

## Trade-offs and next steps

- **Overlaps are allowed but flagged**, rather than blocked: blocking would make dense layouts frustrating to edit, and the rule panel already makes every conflict visible.
- **The violation list shows the closest 50** with a count of the rest; a 500-item random layout produces thousands of pairs, and listing them all would add nothing.
- **Rotation is in 90° steps** so footprints stay aligned with the grid.
- Natural next steps: optimised glTF models with instancing, align and distribute, a 2D plan view, box selection, embedding in a host page over `postMessage`, and an assistant that proposes layout fixes as a preview.

## Use of AI tools

This project was built with **Claude Code** (Anthropic's coding assistant, Claude Opus model) as a pair programmer, working step by step: agreeing the plan and defaults, then building and verifying one step at a time (scaffold, edit model and tests, 3D interaction, panels, performance, polish). The assistant wrote code and tests, ran type-checks, lint, tests and builds, and checked behaviour in a browser after each step; I reviewed each step, made the product and design decisions, and own the result. I can explain and change any part of the code.
