# Grid System

A responsive 12-column grid built on CSS Grid and custom properties. Lives in
`styles/grid.css`, which `styles/styles.css` pulls in with
`@import url('./grid.css')` so it is available on every page.

It is self-contained — it declares its own tokens, so it does not depend on
`styles/variables.css` (which is generated from `styles/variables.scss` and gets
overwritten on regeneration; see [TOKENS.md](./TOKENS.md)).

## Breakpoints

| Viewport         | Range        | Columns | Gutter | Margin              | Col width    | Max width |
| ---------------- | ------------ | ------- | ------ | ------------------- | ------------ | --------- |
| Mobile           | 0–475px      | 4       | 12px   | 20px                | fluid        | —         |
| Tablet Portrait  | 476–834px    | 8       | 12px   | 40px                | fluid        | —         |
| Tablet Landscape | 835–1024px   | 12      | 12px   | 92px                | fluid        | —         |
| Laptop           | 1025–1366px  | 12      | 16px   | 92px                | fluid        | 1736px    |
| Desktop          | 1367–1920px  | 12      | 16px   | 92px                | fluid        | 1736px    |
| Ultrawide        | 1921px+      | 12      | 16px   | auto (412px @2560)  | 130px fixed  | 1736px    |

Laptop and Desktop share identical values, so no media query separates them.

Ultrawide needs no breakpoint either. At exactly 1920px the fluid content area
already measures 1736px (12 × 130px + 11 × 16px), so `max-width: 1736px` plus
`margin-inline: auto` takes over from there and lets the margins grow on their
own — 92px at 1921px, 412px at 2560px. Columns naturally lock at 130px.

## Usage

Wrap items in `.grid` and give each child a span class:

```html
<div class="grid">
  <div class="grid-col-12 grid-col-t-4 grid-col-d-3">Card 1</div>
  <div class="grid-col-12 grid-col-t-4 grid-col-d-3">Card 2</div>
  <div class="grid-col-12 grid-col-t-4 grid-col-d-3">Card 3</div>
  <div class="grid-col-12 grid-col-t-4 grid-col-d-3">Card 4</div>
</div>
```

That gives one card per row on mobile, two per row on tablet, four across on
desktop.

## Span classes

| Prefix           | Applies from | Available range | Grid columns there |
| ---------------- | ------------ | --------------- | ------------------ |
| `.grid-col-*`    | 0px          | 1–12            | 4                  |
| `.grid-col-t-*`  | 476px        | 1–8             | 8                  |
| `.grid-col-d-*`  | 1025px       | 1–12            | 12                 |

There is no `-u-` (ultrawide) prefix; `.grid-col-d-*` already covers 1025px and up.

### Spans are relative to the current breakpoint

This is the main thing to get right. A span is counted against the column count
of the active breakpoint, not always against 12:

| Class           | Mobile (4 cols) | Tablet P (8 cols) | 835px+ (12 cols) |
| --------------- | --------------- | ----------------- | ---------------- |
| `.grid-col-3`   | 75%             | 37.5%             | 25%              |
| `.grid-col-6`   | full row        | 75%               | 50%              |
| `.grid-col-12`  | full row        | full row          | 100%             |

Two consequences:

- **Keep per-row spans within the breakpoint's budget.** On tablet portrait the
  budget is 8, so `t-4 + t-4` pairs up but `t-6 + t-6` (= 12) silently wraps to
  separate rows. Likewise `t-5 + t-3` sits on one row; `t-8 + t-4` does not.
- **Spans larger than the column count fall back to a full row.** A
  `.grid-col-12` on mobile creates implicit tracks and renders full width, which
  is usually what you want — but it is a fallback, not an explicit design.

## How it works

The breakpoint tokens resolve on `body`, then a single declaration on `.grid`
handles both the fluid and capped cases:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  gap: var(--grid-gutter);
  width: min(100% - (2 * var(--grid-margin)), var(--grid-max-width));
  margin-inline: auto;
}
```

Below the cap, `100% - 2 × margin` wins and the grid is fluid with fixed side
margins. Above it, `--grid-max-width` wins and `margin-inline: auto` centres the
grid while the margins absorb the surplus.

Two things to avoid if you edit this rule:

- `max-width: auto` is invalid CSS and gets dropped — that is why the fluid
  breakpoints use `100%` rather than `auto` for `--grid-max-width-*`.
- Do not set `margin-inline: var(--grid-margin)` alongside `margin-inline: auto`;
  the second wins and the margin token becomes dead.

## Tokens

Override on `:root` to retheme:

```
--grid-columns-mobile     --grid-gutter-mobile     --grid-margin-mobile
--grid-columns-tablet-p   --grid-gutter-tablet     --grid-margin-tablet-p
--grid-columns-tablet-l                            --grid-margin-tablet-l
--grid-columns-desktop    --grid-gutter-desktop    --grid-margin-desktop

--grid-max-width-mobile   --grid-max-width-tablet  --grid-max-width-desktop
```

## Verified behaviour

Measured in headless Chrome at each boundary:

```
vw      cols  col   gutter  content  margin
834      8     84    12       754      40
835     12     43    12       651      92
1025    12     55    16       841      92    gutter steps 12 -> 16
1366    12     84    16      1182      92
1920    12    130    16      1736      92    columns hit exactly 130px
1921    12    130    16      1736      93    no jump across the boundary
2560    12    130    16      1736     412    margins absorb the surplus
```

Below 500px is unverified — headless Chrome clamps the viewport to a 500px
minimum, so the 4-column mobile case should be spot-checked in DevTools.

## Notes

- These breakpoints (476 / 835 / 1025) come from the design spec and deliberately
  differ from the 600 / 900 / 1200 values `AGENTS.md` suggests for general styles.
- `drafts/test.html` renders every layout above. Run
  `aem up --html-folder drafts --html-mount /` and open
  `http://localhost:3000/test.html`.
