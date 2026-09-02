# Cloudflare Worker — Hide the `en-in` locale prefix (Option B)

This Worker sits in front of the AEM Edge Delivery origin and hides the **default
locale** prefix from public URLs:

| Visitor sees | Worker fetches from origin |
| --- | --- |
| `https://www.example.com/personal/accounts/saving-account` | `/en-in/personal/accounts/saving-account` |
| `https://www.example.com/` | `/en-in/` |
| `https://www.example.com/hi-in/personal/...` | `/hi-in/personal/...` (non-default locale, unchanged) |

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

1. Copy `index.mjs` into your Cloudflare Worker (dashboard editor, or `wrangler deploy`).
2. Ensure the env vars above are set.
3. Confirm the Worker route covers your production hostname (e.g. `www.example.com/*`).

## Verify after deploy

- `curl -sI https://<host>/personal/accounts/saving-account` → `200`, content renders.
- `curl -sI https://<host>/en-in/personal/accounts/saving-account` → `301` to the clean URL.
- View source on a page: links, `rel="canonical"`, and `og:url` contain **no** `/en-in/`.
- Assets resolve: `/scripts/*`, `/styles/*`, `/blocks/*`, images, and `*.json` load normally.
- `/hi-in/...` (once it exists) still serves with its visible prefix.

## Upgrading to Option A (per-locale hostnames)

When more locales launch and you want each to be prefix-free, give each locale its own
hostname and set `DEFAULT_LOCALE` per Worker/route (or derive it from the request host).
The inbound/outbound logic here already generalizes to that model.
