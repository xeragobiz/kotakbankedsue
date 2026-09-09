# Using the Kotak DLS in Blocks

**The rule:** every block is styled with the Kotak Design Language System (DLS) —
its design tokens and grid — not hardcoded colors, sizes, or ad-hoc breakpoints.

The DLS itself (tokens, grid, and their own reference docs) lives in
`docs/kotak-grid-tokens/` — see [TOKENS.md](./kotak-grid-tokens/TOKENS.md) and
[GRID.md](./kotak-grid-tokens/GRID.md). This document covers **how it's wired into
this site** and **how to author blocks against it**.

---

## 1. How the DLS is wired in

| File | Role |
| --- | --- |
| `styles/variables.css` | 736 Figma-exported tokens (colors, type, spacing, radii). **Never hand-edit** — regenerated from Figma. |
| `styles/grid.css` | Responsive 12-column CSS Grid (`.grid` + `.grid-col-*`). |
| `head.html` | Loads `variables.css` **before** `styles.css`, so tokens are available everywhere. |
| `styles/styles.css` | `@import url('./grid.css')` at the top; base color vars mapped to DLS semantic tokens. |

Wiring (already in place):

```html
<!-- head.html -->
<link rel="stylesheet" href="/styles/variables.css"/>
<link rel="stylesheet" href="/styles/styles.css"/>
```

```css
/* styles/styles.css */
@import url('./grid.css');

:root {
  --text-color:       var(--text-primary-default-base, #131313);
  --background-color: var(--background-1-default-base, white);
  --light-color:      var(--background-2-default-base, #f8f8f8);
  --dark-color:       var(--text-secondary-default-base, #505050);
  --link-color:       var(--action-blue-blue-70, #3b63fb);   /* Kotak brand blue #3857ff */
  --link-hover-color: var(--action-blue-blue-80, #1d3ecf);
}
```

Because the boilerplate color vars now resolve to DLS tokens, body text, links,
buttons, and sections render on-brand automatically.

---

## 2. Authoring rules for blocks

1. **Colors → semantic tokens only.** Use `var(--text-primary-default-base)`,
   `var(--background-2-default-base)`, `var(--button-primary-default-bg-base)`.
   Never raw hex, never primitives (`--neutral-nc-7`).
2. **Typography → responsive type tokens.** `var(--headline-font-size-h5)` etc.
   self-scale across breakpoints — no media queries needed in the block.
3. **Spacing / radius / weight → tokens.** `--spacing-spacing-24`, `--cr-12`,
   `--bold` / `--semibold` / `--medium` / `--regular`.
4. **Layout → the grid.** Wrap items in `.grid` and give children
   `.grid-col-*` / `-t-*` / `-d-*` span classes.
5. **Keep a boilerplate fallback** in `var(--token, fallback)` so styling degrades
   gracefully if `variables.css` is ever unavailable.
6. **Breakpoints → DLS values.** Grid steps at 476/835/1025px; typography at
   600/900/1200px. These are intentional and differ from AGENTS.md — the DLS wins.

### Semantic token shape

`--{role}-{variant}-{surface}-{state}` — e.g. `--button-primary-default-bg-hover`.
`surface` is `default` (light bg) or `inverse` (dark bg); the DLS is light-mode only,
so use `inverse` tokens for on-dark UI.

---

## 3. Worked example — the `placeholder-demo` block

This block is the reference implementation. It lays its value out on the grid and
styles it entirely with DLS tokens.

```js
// blocks/placeholder-demo/placeholder-demo.js  (layout excerpt)
const grid = document.createElement('div');
grid.className = 'grid';
const cell = document.createElement('div');
cell.className = 'grid-col-12 grid-col-t-4 grid-col-d-4'; // full → half → third
cell.append(out);
grid.append(cell);
block.append(grid);
```

```css
/* blocks/placeholder-demo/placeholder-demo.css */
.placeholder-demo .placeholder-demo-value {
  margin: 0;
  padding: var(--spacing-spacing-24, 24px);
  border-radius: var(--cr-12, 12px);
  background-color: var(--background-2-default-base, #f5f5f5);
  color: var(--text-primary-default-base, #131313);
  font-size: var(--heading-font-size-m);
  font-weight: var(--bold, 700);
}
```

Verified computed values on a rendered page: background `#f5f5f5`, text `#121212`,
padding `24px`, radius `12px`, weight `700`, and the grid active (8×73px, 12px gap
at the tablet breakpoint).

---

## 4. Common token reference

| Need | Token |
| --- | --- |
| Primary text | `--text-primary-default-base` |
| Secondary text | `--text-secondary-default-base` |
| Page background | `--background-1-default-base` |
| Card/surface background | `--background-2-default-base` |
| Brand blue (links/CTA) | `--action-blue-blue-70` (hover `-80`) |
| Primary button bg / text | `--button-primary-default-bg-base` / `-text-base` |
| Headings (responsive) | `--headline-font-size-h1`…`h7` |
| Body (responsive) | `--body-font-size-b1`…`b6` |
| Spacing | `--spacing-spacing-0`…`-200` |
| Corner radius | `--cr-0`…`-56` |
| Weight | `--bold` `--semibold` `--medium` `--regular` |

Full list + gotchas: [TOKENS.md](./kotak-grid-tokens/TOKENS.md).

---

## 5. Checklist for a new block

- [ ] Layout uses `.grid` + `.grid-col-*` classes
- [ ] All colors use semantic tokens (no hex, no primitives)
- [ ] Type uses responsive `--*-font-size-*` tokens
- [ ] Spacing/radius/weight use tokens
- [ ] `var(--token, fallback)` fallbacks in place
- [ ] `npm run lint` passes
- [ ] Verified rendered values match intended tokens
