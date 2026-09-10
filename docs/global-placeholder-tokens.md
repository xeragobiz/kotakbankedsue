# Global Placeholder Tokens (`{{key}}`) — Approach & Usage

**Feature:** Author-facing global variables. Type `{{key}}` in any authored text and
it is replaced at render time with the value from the global placeholders sheet
(`/placeholders.json`). Works across **all blocks and default content** — no per-block
code.

Example: authored `Call {{sitename}} at {{customercare}}` renders as
`Call Kotak Bank at 1800-1800-1900`.

---

## How it works

1. **Source of truth:** the placeholders spreadsheet, published at `/placeholders.json`
   (mapped via `public.json`). Each row is a `key → value` global variable.
2. **Utility:** `scripts/placeholders.js`
   - `getPlaceholders()` — fetches the sheet **once** and caches it (module-level
     promise), so any number of tokens/blocks share a single network request.
   - `replacePlaceholderTokens(root)` — scans **text nodes** under `root`, replacing
     every `{{key}}` with its value.
3. **Hook:** called from `loadLazy()` in `scripts.js` after sections load
   (`await replacePlaceholderTokens(main)`), so all authored content is present and it
   runs post-LCP (no impact on the critical render path).

```js
// scripts/scripts.js (loadLazy)
await loadSections(main);
await replacePlaceholderTokens(main);   // {{token}} → value
```

---

## Authoring rules

| Where | Format | Example |
| --- | --- | --- |
| In **content** (any text) | double braces around the key | `{{customercare}}` |
| In the **sheet key column** | just the name — **NO braces** | `customercare` |

- Keys allow word characters, dots, and hyphens: `[\w.-]+`.
- Whitespace inside braces is tolerated: `{{ sitename }}` works.
- **Unknown keys are left untouched** (`{{missing}}` stays as-is) — never breaks a page.
- **Only text is replaced** — HTML attributes and markup are never touched (so
  `title="{{x}}"` is intentionally *not* substituted).

> ⚠️ **Common mistake:** putting braces in the sheet *key* (`{customercare}`). The key
> must be the bare name; braces belong only in the content where the token is used. A
> braced key silently fails to resolve.

---

## Current global variables

From `/placeholders.json`:

| Key | Value |
| --- | --- |
| `sitename` | Kotak Bank |
| `interestrate` | 6.8 |
| `customercare` | 1800-1800-1900 |

Add a new global by adding a row to the placeholders sheet in AEM, then **Preview +
Publish** it. It is immediately usable as `{{newkey}}` anywhere.

---

## Verified behaviour

In-browser test — authored:
```
Reach {{sitename}} customer care at {{customercare}} — rate {{interestrate}}%.
```
rendered:
```
Reach Kotak Bank customer care at 1800-1800-1900 — rate 6.8%.
```
All tokens resolve; unknown keys preserved; attributes untouched.

---

## Performance notes

- **Single fetch, cached** — the sheet is fetched once per page regardless of how many
  tokens appear.
- **Fast bail-out** — if the subtree contains no `{{` token, the walker never runs.
- **Runs in the lazy phase** — after LCP, so it never delays first paint.

---

## Adding/using a token — checklist

- [ ] Add a row to the placeholders sheet: key = bare name (no braces), value = text
- [ ] Preview + Publish the placeholders sheet
- [ ] In content, reference it as `{{key}}` (any block, heading, paragraph, list)
- [ ] Verify it renders the value (hard-reload; unknown keys stay literal)

---

## Files

- `scripts/placeholders.js` — the utility (`getPlaceholders`, `replacePlaceholderTokens`)
- `scripts/scripts.js` — calls `replacePlaceholderTokens(main)` in `loadLazy`
- Placeholders sheet → `/placeholders.json` (authored in AEM)
