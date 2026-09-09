# Design Tokens

Design tokens exported from Figma. Two files, one generated from the other:

| File                    | Role                                                   |
| ----------------------- | ------------------------------------------------------ |
| `styles/variables.scss` | Raw Figma export. Source of truth. Edit only by re-exporting from Figma. |
| `styles/variables.css`  | Generated CSS custom properties. **Never hand-edit.**  |

## Regenerating

```sh
node .claude/tmp/scss-to-css.js
npx stylelint "styles/variables.css" --fix
```

Both steps are required. The generator emits long-form hex (`#ffffff`); the
committed file uses short-form (`#fff`) because stylelint's
`color-hex-length: short` rule normalises it. Skipping the second step leaves the
file failing `npm run lint`.

The generator prints a summary — currently 736 tokens — and reports any aliases
it dropped.

Anything you add to `variables.css` by hand is lost on the next regeneration.
Put non-exported tokens in the stylesheet that owns them; `styles/grid.css` is
the precedent for that.

## Collections

| Collection       | Prefix examples                          | Notes                                    |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| `color-primitive`| `--neutral-nc-*`, `--action-blue-blue-*` | Raw palette. Prefer semantic tokens.     |
| `style`          | `--text-*`, `--background-*`, `--button-*` | Semantic aliases onto primitives. Light mode only. |
| `spacing`        | `--spacing-spacing-0` … `-200`           | 0–200px                                  |
| `font size`      | `--fs-10` … `--fs-52`                    |                                          |
| `font weight`    | `--bold`, `--semibold`, `--medium`, `--regular` | Keywords become numbers (700/600/500/400) |
| `line height`    | `--lh-14` … `--lh-60`                    |                                          |
| `corner radius`  | `--cr-0` … `--cr-56`                     | Alias onto `spacing`                     |
| `Letter Spacing` | `--ls-0` … `--ls-25`                     | Mostly negative tracking                 |
| `Breakpoints`    | typography scales                        | Responsive — see below                   |

### Naming quirk

Figma group names are concatenated verbatim, so some tokens read doubled:

```
--spacing-spacing-16
--action-blue-blue-70
--decorative-colors-deco-one-deco-one-10
```

Not a bug — copy names exactly as generated.

## Semantic tokens

Shaped as `--{role}-{variant}-{surface}-{state}`:

```css
--text-primary-default-base
--button-primary-default-bg-hover
--icon-secondary-inverse-disabled
```

- **surface** — `default` for light backgrounds, `inverse` for dark ones. There is
  no dark-mode block; `inverse` *is* the mechanism for on-dark UI.
- **state** — `base`, `hover`, `pressed`, `disabled`, `selected`, `active`.

Reach for these over primitives so a palette change propagates:

```css
/* good */
color: var(--text-primary-default-base);

/* avoid -- bypasses the semantic layer */
color: var(--neutral-nc-7);
```

## Responsive typography

The `Breakpoints` collection defines one token per typographic role whose value
changes per breakpoint. Mobile lands in `:root`; the rest become media queries:

| Mode    | Emitted as             |
| ------- | ---------------------- |
| Mobile  | `:root` (base)         |
| Tablet  | `@media (width >= 600px)`  |
| Laptop  | `@media (width >= 900px)`  |
| Desktop | `@media (width >= 1200px)` |

So one declaration scales itself — no media queries needed in your block:

```css
.my-block h2 {
  font-size: var(--headline-font-size-h5);
  line-height: var(--headline-line-height-lh-5);
  letter-spacing: var(--headline-letter-spacing-ls-5);
}
```

`--headline-font-size-h5` resolves to 20px on mobile, 24px on tablet/laptop and
28px on desktop.

Roles and their scale suffixes:

| Role           | Scale        | Token pattern                                |
| -------------- | ------------ | -------------------------------------------- |
| `display`      | `ds-1`       | `--display-{semibold,medium}-font-size-ds-1` |
| `headline`     | `h1`–`h7`    | `--headline-font-size-h4`                    |
| `body`         | `b1`–`b6`    | `--body-font-size-b2`                        |
| `section-title`| `s`, `m`     | `--section-title-font-size-m`                |
| `button`       | `bt-1`–`bt-3`| `--button-font-size-bt-2`                    |
| `link-button`  | `l-1`, `bt-2`| `--link-button-font-size-l-1`                |
| `amount`       | `a1`–`a8`    | `--amount-font-size-a3`                      |
| `decimal`      | `d1`–`d8`    | `--decimal-font-size-d3`                     |
| `symbol`       | `s1`–`s8`    | `--symbol-font-size-s3`                      |

Match the numeric suffix across font-size, line-height and letter-spacing —
`b2` with `lh-2` and `ls-2`. The `amount` / `decimal` / `symbol` trio is built to
compose for currency (₹ symbol + integer + decimals).

### Typography breakpoints differ from the grid

Typography steps at **600 / 900 / 1200px**; `styles/grid.css` steps at
**476 / 835 / 1025px** to match the grid spec. They are independent by design, so
type size and column count do not change at the same widths. Don't assume a
shared breakpoint when aligning the two.

## Gotchas

- **Light mode only.** The `style` collection exports a single `Light` mode. Use
  `inverse` tokens for dark surfaces rather than expecting a dark-mode override.
- **One alias is dropped on purpose.** The export re-lists
  `--decorative-colors-deco-three-deco-three-20` pointing at the `-10` step,
  which would override the primitive. The generator skips it and logs it.
- **A few tokens alias across categories, at some breakpoints only.**
  `--decimal-line-height-lh-3` is `--lh-24` on mobile and `--lh-28` on
  laptop/desktop, but `--fs-28` — a *font-size* token — on tablet. Same for
  `--symbol-line-height-lh-3`. Comes from the export; verify against Figma before
  relying on it.
- **`--cr-40` maps to `--spacing-spacing-44`**, not `-40`. Also from the export.

## Reference

- `head.html` loads `styles/variables.css` ahead of `styles/styles.css`, so tokens
  are available to every stylesheet.
- Grid tokens live in `styles/grid.css`, which `styles.css` pulls in via
  `@import` — see [GRID.md](./GRID.md).
