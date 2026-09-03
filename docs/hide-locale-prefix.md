# Hiding the `en-in` Locale Prefix from Public URLs — Approach & POC

**Status:** ✅ Live and verified
**Site:** `xeragobiz/kotakbankedsue` (AEM authoring as content source, `type: markup`)
**Goal:** Serve `https://<host>/personal/accounts/saving-account` instead of
`https://<host>/en-in/personal/accounts/saving-account` — i.e. hide the default
locale prefix — while keeping room for additional locales (`hi-in`, …).

---

## TL;DR — the working solution

Two pieces, both supported for AEM-authoring projects:

1. **Config-service path mapping** (`public.json`) maps the AEM content tree to
   clean public URLs — this is what actually hides `en-in`.
2. **Redirects sheet** (`/redirects.json`) 301s old `/en-in/...` URLs to the clean
   URLs, so existing links and SEO are preserved.

Authoring is unchanged; only the way pages are *delivered* and *previewed* changes.

---

## Final configuration

### 1. Path mapping (`public.json`)

Applied via the configuration service (not a repo file):

```bash
curl -X POST https://admin.hlx.page/config/xeragobiz/sites/kotakbankedsue/public.json \
  -H 'content-type: application/json' \
  --data '{
  "paths": {
    "mappings": [
      "/content/kotakbankedsue/en-in/:/",
      "/content/kotakbankedsue/hi-in/:/hi-in/",
      "/content/kotakbankedsue/redirects:/redirects.json"
    ],
    "includes": ["/content/kotakbankedsue/", "/content/dam/kotakbankedsue/"],
    "excludes": ["/content/kotakbankedsue/**/drafts/**"]
  }
}'
```

- `en-in/ → /` — hides the default-locale prefix.
- `hi-in/ → /hi-in/` — second locale keeps a visible prefix (single-domain / Option B).
- `redirects → /redirects.json` — **must** end in `.json` so the sheet publishes as
  a data sheet, not a page (this was the key fix; see Pitfalls).
- DAM is left at `/content/dam/kotakbankedsue/` because authored pages reference that
  path directly — remapping it to `/assets/` would break image URLs.

Verify: `https://main--kotakbankedsue--xeragobiz.aem.page/config.json`

### 2. Redirects sheet (authored in AEM, published to `/redirects.json`)

Columns must use **public URL paths** (relative to the domain), not `/content/...` paths:

| source | destination |
| --- | --- |
| `/en-in/personal/accounts/saving-account` | `/personal/accounts/saving-account` |

- **source** = the OLD public URL to catch.
- **destination** = the NEW clean public URL.
- One row per URL — the sheet does **not** support wildcards.

Verify: `https://main--kotakbankedsue--xeragobiz.aem.page/redirects.json` returns JSON.

---

## Verified behavior

| URL | Result |
| --- | --- |
| `/personal/accounts/saving-account` (clean) | `200` |
| `/en-in/personal/accounts/saving-account` (old) | `301` → clean URL → `200` |
| `/redirects.json` | `200`, `application/json`, correct row |

Confirmed on both `--.aem.page` (preview) and `--.aem.live` (production preview).

---

## Operating procedure

### Publishing a page so it appears at its clean URL
The mapping is site-wide, but each existing page must be **re-published** once to move
to its clean path. New pages publish to clean paths automatically.

### Previewing a page (IMPORTANT)
Sidekick's "Preview from editor" button can mis-resolve the path when a locale prefix is
stripped (it produces a mangled `/en-in/content/kotakbankedsue/...` path → an
`html2md` 404). This is an **authoring-preview artifact only** — the live site is
unaffected.

**Workaround:** preview by opening the clean public URL directly. Rule: take the AEM
author path, drop `/content/kotakbankedsue/en-in`, and the remainder is the public URL.

| AEM author path | Public URL |
| --- | --- |
| `/content/kotakbankedsue/en-in/` | `/` |
| `/content/kotakbankedsue/en-in/personal/accounts/saving-account` | `/personal/accounts/saving-account` |

### Adding a redirect for another old URL
Add a row to the redirects sheet (source = old `/en-in/...`, destination = clean path),
then Quick Publish. Verify at `/redirects.json`.

---

## Approaches evaluated (and why we landed here)

| Approach | Verdict | Notes |
| --- | --- | --- |
| **Config-service path mapping** | ✅ **Chosen** | Supported for AEM-authoring sources; natively serves clean URLs. |
| **Redirects sheet** | ✅ **Chosen (companion)** | Handles 301s for old URLs. 1:1 rows only, no wildcards. |
| Folder mapping (`paths.json` `->`, feature-flagged) | ❌ Rejected | Different feature; "infinite 200 URL space", disrecommended for SEO/locale; maps to a single page. |
| `xwalk.json` | ❌ N/A | Universal Editor feature flag only; nothing to do with URLs. |
| Cloudflare Worker (inbound rewrite) | ⏸️ Superseded | Path mapping does the inbound job natively. |
| Cloudflare Worker (redirect-only, `tools/cloudflare-worker/redirect-en-in.mjs`) | 🔵 Optional | Use instead of the sheet if you want a single **wildcard** `/en-in/*` 301 with no per-row upkeep. |

---

## Pitfalls encountered (so you don't repeat them)

1. **Wrong `paths.json` variant.** "Folder mapping" (the feature-flagged `->` syntax)
   is a different feature from the AEM-authoring content-source path mapping. Only the
   latter hides a locale prefix. See
   https://www.aem.live/developer/authoring-path-mapping
2. **`:/redirects` vs `:/redirects.json`.** For AEM-authoring spreadsheets the `.json`
   is **not** auto-appended. Mapping to `:/redirects` published the sheet as a page
   (`text/plain`/`.md`), so `/redirects.json` 404'd and the redirect engine never fired.
   The mapping must be `:/redirects.json`.
3. **Redirect row direction / path style.** source/destination must be **public paths**
   (not `/content/...`) and in the right direction (old → new). A reversed/`/content`
   row will 301 your *clean* URL to a 404.
4. **Cached 301s.** Browsers cache 301s aggressively; after fixing a bad row, use a
   hard reload / incognito to re-test.
5. **Re-publish required.** Pages only move to clean URLs after being re-previewed and
   re-published following the mapping change.

---

## Multi-locale / scaling notes

- Current model (Option B): default locale (`en-in`) hidden on the main domain; other
  locales (`hi-in`) keep a visible prefix on the same domain.
- To make *every* locale prefix-free, move to per-locale hostnames (Option A) — each host
  maps its locale to `/`. The path-mapping mechanism generalizes to that model.
- For a blanket `/en-in/*` 301 (instead of one redirect row per page), use the
  redirect-only Cloudflare Worker at `tools/cloudflare-worker/redirect-en-in.mjs`.

---

## References

- Path mapping for AEM authoring: https://www.aem.live/developer/authoring-path-mapping
- Managing tabular data (redirects sheet): https://www.aem.live/docs/authoring-tabular-data
- Redirects: https://www.aem.live/docs/redirects
- Configuration service: https://www.aem.live/docs/config-service-setup
