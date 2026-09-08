# Code Path Structure & Whitelisting — Investigation & Decision

**Site:** `xeragobiz/kotakbankedsue` (AEM authoring as content source; code source = GitHub repo, root-served)
**Question investigated:** Can we put all delivery code (scripts, styles, blocks, fonts,
icons) under a single common folder (e.g. `/assets/` or `/code/`) so it's easy to
whitelist during build / at the CDN?

> **Decision:** ❌ Do **not** nest code under a common folder. ✅ Keep the standard
> root layout and whitelist the fixed, platform-guaranteed code patterns.

---

## 1. What was asked

Move `/scripts`, `/styles`, `/blocks`, `/fonts`, `/icons` under one folder so a single
path prefix could be whitelisted (CDN pass-through / build / firewall).

## 2. Why it can't be done the simple way

### Folder names are hardcoded by the platform
`scripts/aem.js` builds code URLs from fixed folder names:

```js
`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.js`   // /blocks/
`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`  // /blocks/
`${window.hlx.codeBasePath}${prefix}/icons/${iconName}.svg`        // /icons/
loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`)       // /styles/
```

`head.html` also hardcodes `/scripts/aem.js`, `/scripts/scripts.js`, `/styles/styles.css`.
Renaming/merging these into one flat folder breaks the runtime — it still requests the
old paths.

### `/assets/` is already taken
`/assets/` is mapped to the DAM (`/content/dam/kotakbankedsue/ → /assets/`), so it can't
double as a code folder.

## 3. The only technical route (and why it's rejected)

The single lever is **`codeBasePath`** — auto-derived in `aem.js` by splitting the
`scripts.js` URL on `/scripts/scripts.js` (lines ~167–172). If `head.html` loaded
`/code/scripts/scripts.js`, then `codeBasePath` becomes `/code` and blocks/styles/icons/
fonts would all resolve under `/code/...`.

To make that real you would have to:
1. Physically **nest the folders in the repo**: `/code/scripts/`, `/code/styles/`,
   `/code/blocks/`, `/code/icons/`, `/code/fonts/`.
2. Edit `head.html` to load `/code/scripts/scripts.js` (sets `codeBasePath = /code`).

Confirmed by test: the code-source config is a plain GitHub repo (`type: github`, no
subdirectory), served at root. There is **no config knob** to serve the repo under a
prefix — the folders must physically move.

```
/scripts/scripts.js        -> 200   (code served at root today)
/code/scripts/scripts.js   -> 404
/assets/scripts/scripts.js -> 404
```

Note: even then, the folder **names** (`scripts`, `blocks`, `styles`, `icons`, `fonts`)
are preserved under the prefix — you cannot flatten them into one folder with mixed files.

## 4. Impact on EDS feature releases (the decisive factor)

EDS ships features through two channels:

| Channel | Affected by `/code` nesting? |
| --- | --- |
| **Boilerplate code updates** (aem.js, scripts.js, blocks, head.html) | ⚠️ **Yes** |
| **Platform / runtime features** (backend, admin/config service, image optimization) | ✅ No (server-side, layout-agnostic) |
| **Block Collection patterns** | ⚠️ Partial (assume `/blocks/` at root) |

Adobe always ships boilerplate files at **root** paths. If code is nested under `/code/`,
every upstream boilerplate update:
- Lands at root and **conflicts** with the nested layout
- Requires **re-nesting** each updated file and **re-patching** `head.html` on every pull
- Risks missing security/performance fixes because updates no longer drop in cleanly

`aem.js` is explicitly "NEVER MODIFY" and meant to be replaced wholesale by upstream —
nesting breaks that drop-in model.

## 5. Decision & recommended approach

**Keep the standard root layout.** Achieve the whitelisting goal by allow-listing the
**fixed, platform-guaranteed code patterns** — no folder move, zero impact on releases:

```
/scripts/*
/styles/*
/blocks/*
/icons/*
/fonts/*
/*.js
/*.css
/head.html
/404.html
/favicon.ico
```

These locations never change (the platform guarantees them), so this allow-list is as
stable and reliable as a single folder would have been — without fighting the boilerplate.

### Trade-off summary

| Approach | Works? | Feature-release impact | Verdict |
| --- | --- | --- | --- |
| Config knob to serve repo under `/code` | No such option | — | Not available |
| Nest folders as `/code/...` + edit head.html | Technically yes | ⚠️ Conflicts on every boilerplate update | ❌ Rejected |
| Whitelist fixed root patterns | Yes | ✅ None | ✅ **Chosen** |

## 6. For reference — full served-path taxonomy

| Category | Paths | Source |
| --- | --- | --- |
| Code | `/scripts`, `/styles`, `/blocks`, `/icons`, `/fonts`, `head.html`, `404.html`, `favicon.ico` | GitHub repo (code bus) |
| Content | pages, `/nav/nav`, `/assets/…` (DAM) | AEM author (content bus) |
| Generated/data | `/query-index.json`, `/sitemap.xml`, `/robots.txt`, `/redirects.json`, `/config.json` | EDS-generated |
| Reserved | `/.well-known/…`, `/media_<hash>.<ext>`, `/.rum/`, `/.optel/`, `/drafts/` | Infra |

Any CDN rule (redirect/rewrite) must act **only** on content page paths and pass all code,
data, media, and reserved paths through untouched.

## 7. References

- Boilerplate: https://github.com/adobe-rnd/aem-boilerplate-xwalk
- Anatomy of a project: https://www.aem.live/developer/anatomy-of-a-project
- See also: `docs/url-hiding-and-redirects.md` (CDN routing & pass-through rules)
