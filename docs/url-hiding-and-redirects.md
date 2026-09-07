# URL Prefix Hiding & Redirects — Design & Status

**Site:** `xeragobiz/kotakbankedsue` (AEM authoring as content source, `type: markup`)
**Purpose:** Serve clean, prefix-free public URLs (hide the `en-in` locale prefix) and
301-redirect the old prefixed URLs so links/SEO are preserved.

> **Status legend:** ✅ live & verified · 🟡 partially done · ⛔ pending

---

## 1. The design (two mechanisms)

Prefix hiding and redirects are **two separate mechanisms** that work together:

1. **Config-service path mapping** (`public.json`) — maps AEM content-tree paths to
   clean public URLs. *This is what hides the prefix.* Applied via the config service
   (`admin.hlx.page/config/.../public.json`), not a repo file.
2. **Redirects sheet** (`/redirects.json`) — 301s old prefixed URLs to the clean URL.
   Authored in AEM, published to `/redirects.json`. **Literal rows only — no wildcards.**

For a blanket `/en-in/*` 301 (every page, no per-row upkeep), a CDN worker is required
instead of the sheet (see §5).

---

## 2. Current live configuration

### Path mapping (`public.json`) — ✅ live

```json
{
  "paths": {
    "mappings": [
      "/content/kotakbankedsue/en-in/:/",
      "/content/kotakbankedsue/hi-in/:/hi-in/",
      "/content/kotakbankedsue/ta-in/:/ta-in/",
      "/content/dam/kotakbankedsue/:/assets/",
      "/content/kotakbankedsue/redirects:/redirects.json"
    ],
    "includes": ["/content/kotakbankedsue/", "/content/dam/kotakbankedsue/"],
    "excludes": ["/content/kotakbankedsue/**/drafts/**"]
  }
}
```

| Mapping | Effect | Status |
| --- | --- | --- |
| `en-in/ → /` | Default locale served prefix-free | ✅ |
| `hi-in/ → /hi-in/` | Hindi locale, visible prefix | ✅ |
| `ta-in/ → /ta-in/` | Tamil locale, visible prefix | ✅ |
| `dam/kotakbankedsue/ → /assets/` | DAM files addressable at `/assets/...` | ✅ (used only for directly-linked assets) |
| `redirects → /redirects.json` | Serves the redirects sheet as JSON | ✅ |

> **Note:** the `en-in/personal/ → /` mapping that once also hid the `personal` segment
> has been **removed**. Clean URLs currently **include** `personal`
> (e.g. `/personal/accounts/saving-account`).

Verify: `https://main--kotakbankedsue--xeragobiz.aem.page/config.json`

### Redirects sheet (`/redirects.json`) — 🟡 partial

Current live content: **one row.**

| source | destination |
| --- | --- |
| `/en-in/` | `/` |

---

## 3. Verified behavior (as of this writing)

| URL | Result | Notes |
| --- | --- | --- |
| `/personal/accounts/saving-account` (clean) | `200` | ✅ prefix hidden |
| `/accounts/saving-account` | `200` | lingering from earlier `personal`-hidden scheme |
| `/premium-banking/privacy` | `200` | ✅ |
| `/en-in/` | `301 → /` | ✅ root redirect works |
| `/en-in/personal/accounts/saving-account` | `404` | ⛔ **deep-page redirect NOT in place** |

---

## 4. ⛔ Open item — deep `/en-in/*` pages are not redirected

**Prefix hiding works. The "404 → 301" redirect goal is only partially achieved.**
The redirects sheet has a single `/en-in/ → /` row, which matches only the exact
`/en-in/` root. Deep pages like `/en-in/personal/accounts/saving-account` return a plain
**404** — they are **not** redirected.

The sheet **cannot** fix this with a wildcard (`/en-in/*` is silently ignored — see §6).
To redirect all old prefixed URLs, choose one:

- **Literal rows** — add one row per old page to the sheet (works today; manual upkeep):

  | source | destination |
  | --- | --- |
  | `/en-in/personal/accounts/saving-account` | `/personal/accounts/saving-account` |
  | `/en-in/corporate` | `/corporate` |
  | *(one row per page…)* | |

- **CDN worker** — deploy `tools/cloudflare-worker/redirect-en-in.mjs` for a single
  blanket `/en-in/*` → clean 301 covering all current and future pages (see §5).

---

## 5. Blanket wildcard redirect (CDN worker)

For "all `/en-in/*` redirect to the stripped path" in one rule, use the redirect-only
worker already in the repo: `tools/cloudflare-worker/redirect-en-in.mjs`. Deploy it in
Cloudflare (env `ORIGIN_HOSTNAME=main--kotakbankedsue--xeragobiz.aem.live`, route the
production host). This is the supported way to do wildcard redirects, since the redirects
sheet does not support them.

---

## 6. Pitfalls (learned during this work)

1. **Config service, not a repo file.** The path mapping lives in `public.json` on the
   config service — a `paths.json` committed to the repo does nothing.
2. **`:/redirects.json`, not `:/redirects`.** The `.json` is required so the sheet
   publishes as JSON data; otherwise it publishes as an HTML page and `/redirects.json`
   404s and no redirect fires.
3. **Redirect rows use public paths, correct direction.** source/destination must be
   public URLs (not `/content/...`), old → new. A reversed/`/content` row will 301 a
   clean URL to a 404.
4. **No wildcards in the sheet.** `/en-in/*` or `/en-in/**` rows are silently ignored.
   Use literal rows or the CDN worker.
5. **Re-publish required.** Pages move to clean URLs only after being re-previewed and
   re-published following a mapping change.
6. **Unpublish ordering.** Remove a stale page copy only *after* its redirect is live,
   or the old URL 404s with nothing to catch it.
7. **Keep a locale's mapping line.** Removing e.g. `hi-in/:/hi-in/` breaks Sidekick
   preview/publish for that whole locale subtree. Add a mapping line for every locale.
8. **Cached 301s.** Browsers cache 301s aggressively; hard-reload / incognito to re-test.

---

## 7. Sitemap

`/sitemap.xml` is generated from the clean URLs — **`en-in` does not appear** in it.
Open item: the sitemap emits `https://undefined/...` because no production hostname is
configured (`cdn.prod.host` empty; `origin` set to the preview host as a placeholder).
Fix when the real domain is known.

---

## 8. References

- Path mapping for AEM authoring: https://www.aem.live/developer/authoring-path-mapping
- Managing tabular data (redirects sheet): https://www.aem.live/docs/authoring-tabular-data
- Redirects: https://www.aem.live/docs/redirects
- Configuration service: https://www.aem.live/docs/config-service-setup

See also: `docs/hide-locale-prefix.md` (earlier version of this write-up) and
`docs/access-permissions-matrix.csv` (maker/checker access model).
