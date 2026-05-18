# anchor-visibility-observer-for-overlays-tooltips

Occlusion-aware utilities for overlays and tooltips in complex UIs.

This package solves a common problem: a tooltip stays visible even when its anchor is already hidden under a modal, sidebar, sticky panel, or another overlay. Instead of fighting `z-index` case by case, this library observes the real visibility of the anchor and reacts to overlap.

## What it does

- observes `HTMLElement` and `SVGElement` anchors
- uses `IntersectionObserver` to react to viewport visibility changes
- uses `elementsFromPoint` to detect occlusion by other layers
- ignores your own tooltip overlay if you mark it with a selector
- provides a small delegated hover helper for library-rendered DOM and SVG

## Installation

```bash
npm install anchor-visibility-observer-for-overlays-tooltips
```

## Core idea

The library samples several points on an anchor:

- center
- top
- bottom
- left
- right

For every point it asks the browser which element is actually on top at that pixel. If the anchor is no longer top-most for enough points, it is treated as hidden or occluded.

## API

### `observeAnchorVisibility(anchor, options)`

Low-level headless observer for one anchor.

```ts
import {observeAnchorVisibility} from 'anchor-visibility-observer-for-overlays-tooltips';

const handle = observeAnchorVisibility(button, {
  threshold: 0.25,
  ignoreSelectors: ['.my-tooltip-layer'],
  onVisible: (state) => {
    console.log('visible again', state);
  },
  onHidden: (state) => {
    console.log('occluded or out of view', state);
  },
});

handle.revalidate();
handle.disconnect();
```

### `bindDelegatedTooltip(options)`

Small helper for cases where a third-party library renders the DOM and you want delegated hover handling.

```ts
import {bindDelegatedTooltip} from 'anchor-visibility-observer-for-overlays-tooltips';

const binding = bindDelegatedTooltip({
  container: diagramRoot,
  getAnchorFromEventTarget: (target) =>
    target instanceof Element ? target.closest('[data-tooltip]') : null,
  getTooltipContent: (anchor) => anchor.getAttribute('data-tooltip'),
  showTooltip: (anchor, content) => {
    renderTooltip(anchor, content);
  },
  hideTooltip: () => {
    destroyTooltip();
  },
  observer: {
    ignoreSelectors: ['.my-tooltip-layer'],
  },
});

binding.destroy();
```

## Typical use cases

- BPMN/diagram editors with context pads, replace menus, drilldown controls
- Mermaid or SVG-based visualizations
- sticky side panels that cover the hovered anchor
- modals and mini-detail panes that overlap the original hover target

## Why this is better than a z-index fix

A `z-index` fix usually solves one local conflict and creates another one somewhere else. This package takes a different approach:

- it does not need knowledge of a specific library
- it does not rely on BPMN selectors or app-specific class names
- it reacts to actual overlap, not guessed layer numbers

## Limitations

- This is still a browser-side heuristic, not a perfect geometry engine.
- Extremely small anchors may require custom `samplePoints` or a lower `threshold`.
- Some highly custom rendering setups may need extra `ignoreSelectors`.

## Design notes

The package is intentionally headless-first:

- `observeAnchorVisibility` is the reusable primitive
- `bindDelegatedTooltip` is just a convenience layer

That makes it easy to use from:

- vanilla DOM
- React
- Angular
- third-party SVG/diagram libraries

## Development

```bash
npm install
npm run check
npm run test
npm run build
```

## Playground

For a quick manual check, run:

```bash
npm run build:playground
npm run playground
```

Then open:

```txt
http://localhost:4173/playground/
```

The playground simulates the exact failure mode this package is meant to solve:

- hover an anchor
- open or close the right panel
- the tooltip should disappear once the anchor becomes covered

## Vercel deployment

This repository includes a ready-to-serve static playground setup for Vercel:

- `npm run build:playground` builds the library and bundles the playground into a self-contained `playground/main.js`
- `vercel.json` publishes `playground/` as the output directory

That matters because the playground should stay deployable as static files without relying on sibling folders outside `playground/`.

## Framework examples

Ready-to-read integration snippets live in [examples/README.md](./examples/README.md):

- [vanilla](./examples/vanilla.ts)
- [react](./examples/react.tsx)
- [angular](./examples/angular.ts)
- [vue](./examples/vue.ts)

## License

MIT
