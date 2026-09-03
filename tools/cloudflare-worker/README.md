# Hiding the `en-in` locale prefix — final architecture

The prefix is hidden by **two complementary pieces**:

1. **AEM config-service path mapping** (the primary mechanism) — maps
   `/content/kotakbankedsue/en-in/ -> /` so the origin serves clean, prefix-free
   URLs natively. Applied via `admin.hlx.page/config/.../public.json` (see
   "Path mapping" below). This is what actually makes `/personal/...` resolve.
2. **`redirect-en-in.mjs`** (this Worker) — 301s the OLD `/en-in/*` URLs to the
   clean URLs. A blanket `/en-in/*` redirect is a wildcard, and the AEM redirects
   sheet does not support wildcards, so it must live at the CDN.

`index.mjs` (the original inbound-rewrite Worker) is now superseded by the path
mapping for the inbound direction — deploy `redirect-en-in.mjs` instead.

## Path mapping (already applied to the live config)

```json
{
  "paths": {
    "mappings": [
      "/content/kotakbankedsue/en-in/:/",
      "/content/kotakbankedsue/hi-in/:/hi-in/"
    ],
    "includes": ["/content/kotakbankedsue/", "/content/dam/kotakbankedsue/"],
    "excludes": ["/content/kotakbankedsue/**/drafts/**"]
  }
}
```

Applied with (credentials injected automatically, no token in the command):

```bash
curl -X POST https://admin.hlx.page/config/xeragobiz/sites/kotakbankedsue/public.json \
  -H 'content-type: application/json' --data @public.json
```

Verify: `https://main--kotakbankedsue--xeragobiz.aem.page/config.json`.
Each existing page must be **re-published** to appear at its clean path.

---

## Worker (redirect-only): hides the prefix on OLD URLs

`redirect-en-in.mjs` sits in front of the AEM Edge Delivery origin and 301s the
**default locale** prefix from old public URLs:

| Visitor sees | Worker fetches from origin |
| --- | --- |
| `https://www.kotak.com/personal/accounts/saving-account` | `/en-in/personal/accounts/saving-account` |
| `https://www.kotak.com/` | `/en-in/` |
| `https://www.kotak.com/hi-in/personal/...` | `/hi-in/personal/...` (non-default locale, unchanged) |

It is built on Adobe's official production Worker
(`adobe/aem-cloudflare-prod-worker`) with three additions:

1. **Inbound** — prefix-free page requests get `/en-in` prepended before hitting the origin.
2. **Redirect** — explicit `/en-in/...` page requests 301 to the clean URL (SEO consolidation).
3. **Outbound** — `/en-in` is stripped from `<a href>`, canonical, `alternate`, and `og:url` in returned HTML, plus any origin redirect `Location` headers, so navigation stays clean.

Assets (JS/CSS/images/fonts/JSON), media, RUM, and drafts are never rewritten.

## Why a Worker (and not folder mapping)

AEM's folder mapping is explicitly **not** recommended for locale/SEO prefix hiding —
it produces an "effectively infinite URL space that always serves 200" and targets a
single page, which breaks the sitemap and canonicals. Since this site already uses a
bring-your-own Cloudflare CDN, the Worker is the supported place for this rewrite.

## Configuration

Set these Worker environment variables (Cloudflare dashboard → your Worker → Settings → Variables):

| Variable | Value | Notes |
| --- | --- | --- |
| `ORIGIN_HOSTNAME` | `main--kotakbankedsue--xeragobiz.aem.live` | Origin backend host |
| `PUSH_INVALIDATION` | `enabled` (prod) / `disabled` (non-prod) | Content purge on publish |
| `ORIGIN_AUTHENTICATION` | site token (`hlx_...`) | **Only** if the site is token-protected. Store as a Secret, never in git. |

To change which locale is hidden, edit `DEFAULT_LOCALE` at the top of `index.mjs`.

## Deploy

The credentials for pushing to Cloudflare are managed in your Cloudflare account —
do not paste tokens into files or chat.

1. Copy `redirect-en-in.mjs` into your Cloudflare Worker (dashboard editor, or `wrangler deploy`).
2. Ensure the env vars above are set.
3. Confirm the Worker route covers the production hostname: `www.kotak.com/*`.

## Verify after deploy

```bash
# Clean URL serves the en-in page → expect 200
curl -sI https://www.kotak.com/personal/accounts/saving-account | head -1

# Explicit locale URL consolidates to the clean URL → expect 301 + Location: /personal/accounts/saving-account
curl -sI https://www.kotak.com/en-in/personal/accounts/saving-account | grep -iE '^(HTTP|location)'

# Links / canonical / og:url must contain NO /en-in/
curl -s https://www.kotak.com/personal/accounts/saving-account | grep -iE 'canonical|og:url|href="/en-in' | head

# Assets still resolve → expect 200 each
curl -sI https://www.kotak.com/scripts/scripts.js | head -1
curl -sI https://www.kotak.com/query-index.json | head -1
```

- Clean page URL → `200`, content renders.
- `/en-in/...` → `301` to the clean URL.
- Page source: links, `rel="canonical"`, and `og:url` contain **no** `/en-in/`.
- Assets resolve: `/scripts/*`, `/styles/*`, `/blocks/*`, images, and `*.json` load normally.
- `/hi-in/...` (once it exists) still serves with its visible prefix.

## Upgrading to Option A (per-locale hostnames)

When more locales launch and you want each to be prefix-free, give each locale its own
hostname and set `DEFAULT_LOCALE` per Worker/route (or derive it from the request host).
The inbound/outbound logic here already generalizes to that model.
