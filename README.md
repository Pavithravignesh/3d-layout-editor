# 3D Layout Editor

A browser-based 3D layout editor for placing, arranging and validating equipment on an electrical-room floor grid. Built with React and TypeScript.

> **Status:** In progress. This README will be completed with full run instructions, architecture notes and performance measurements as the project develops.

## Planned features

- 20 m × 12 m floor grid with 0.5 m cells
- Item palette with grid-snapped placement
- Select, move, rotate and delete items
- Full undo and redo for every edit
- Placed-items list and properties panel, kept in sync with the 3D view
- Live clearance rule: items closer than 0.6 m are highlighted with a message
- Bill of materials with English and Vietnamese language toggle

## Tech stack (planned)

| Area | Choice |
| --- | --- |
| Framework | React + TypeScript (strict) |
| Build tool | Vite |
| 3D | three.js via React Three Fiber |
| State | Zustand with a command-based undo/redo model |
| i18n | react-i18next |
| Testing | Vitest + Testing Library |

## Getting started

_Run instructions will be added once the project is scaffolded._

## Performance

_Frame rate with 500 placed items, and the hardware it was measured on, will be recorded here._

## Use of AI tools

This project is developed with the help of Claude Code (Anthropic) as an AI coding assistant. Details of how it was used will be documented here.
