# Why Section Segments (e.g. `personal`) Are NOT Hidden

**Site:** `xeragobiz/kotakbankedsue` (AEM authoring as content source)
**Decision:** Hide the **locale** prefix (`en-in`) only. Do **not** flatten section
folders like `personal` to root.

> This note exists so nobody re-adds a `en-in/personal/ → /` mapping later and breaks
> the parallel section pages. It was tried, and removed for the reason below.

---

## The rule

**Only ONE folder level can occupy the root `/` per domain.**

We give root to the **locale** (`en-in`). A section folder (`personal`) cannot *also*
be flattened to root, because sections must keep their own path segment to stay
distinct from one another.

---

## Why hiding `personal` breaks things

The current (correct) mapping hides only the locale:

```
/content/kotakbankedsue/en-in/  →  /
```

So everything under `en-in` is served at root, keeping each section under its own path:

```
/personal/accounts/saving-account   ✅
/premium-banking/privacy            ✅
/corporate                          ✅
```

If we ALSO add a rule to flatten `personal`:

```
/content/kotakbankedsue/en-in/           →  /
/content/kotakbankedsue/en-in/personal/  →  /   ← collision
```

…then **two rules both target root `/`**, and `personal`'s children compete for the
same root-level namespace as the other sections:

- `en-in/personal/accounts`  wants  `/accounts`
- `en-in/premium-banking`    sits at `/premium-banking`
- `en-in/corporate`          sits at `/corporate`

`personal` flattened to root can no longer render **in parallel** with `premium-banking`,
`corporate`, etc. — they collide. This is the "can't render parallel pages with en-in"
problem that was observed.

---

## When hiding `personal` *seemed* to work

Flattening `personal` only worked while it was effectively the **only** section on the
site. As soon as multiple parallel sections exist (`personal`, `premium-banking`,
`corporate`, …), a section cannot be flattened — it needs its own segment.

---

## The correct model

| Folder level | Flatten to root? | Reason |
| --- | --- | --- |
| **Locale** (`en-in`) | ✅ Yes | Exactly one thing owns root; the locale is the right choice |
| **Section** (`personal`, `premium-banking`, `corporate`) | ❌ No | Sections must keep their segment to coexist in parallel |
| Other locales (`hi-in`, `ta-in`) | Keep visible prefix | Only one locale can own root per domain |

Resulting clean URLs (correct, collision-free):

```
/                              (en-in home)
/personal/accounts/saving-account
/premium-banking/privacy
/corporate
/hi-in/...                     (Hindi, visible prefix)
/ta-in/...                     (Tamil, visible prefix)
```

---

## If prefix-free section URLs are ever required

To make a *second* thing prefix-free (another locale, or a section at root), it needs its
**own hostname** — e.g. serve `personal` content from a dedicated domain that maps
`en-in/personal/ → /` on *that* host. On a single shared domain, only one folder level
can own root.

---

## See also

- `docs/url-hiding-and-redirects.md` — the full hide + redirect design & status
- `docs/hide-locale-prefix.md` — earlier write-up of the locale-hiding approach
