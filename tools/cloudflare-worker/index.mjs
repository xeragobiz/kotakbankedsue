/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

/*
 * ---------------------------------------------------------------------------
 * LOCALE PREFIX HIDING (Option B)
 * ---------------------------------------------------------------------------
 * The content in AEM lives under locale folders (e.g. /en-in/...). We want the
 * public site to serve the DEFAULT locale (en-in) WITHOUT the prefix, so that
 *   https://www.example.com/personal/accounts/saving-account
 * transparently serves
 *   /en-in/personal/accounts/saving-account
 * from the origin, while non-default locales (e.g. /hi-in/...) keep their
 * visible prefix. This is the "hide only the default locale" strategy and can
 * later be upgraded to a per-hostname model (Option A) as more locales launch.
 *
 * How it works:
 *  1. INBOUND  - page/fragment requests without a locale prefix get DEFAULT_LOCALE
 *                prepended before the request is sent to the origin.
 *  2. REDIRECT - if a visitor hits the default locale explicitly (/en-in/...),
 *                301 them to the clean (prefix-free) URL to consolidate SEO.
 *  3. OUTBOUND - links / canonical / og:url in returned HTML have the default
 *                locale prefix stripped so navigation stays on clean URLs.
 *
 * Assets (JS/CSS/images/fonts/JSON), RUM, media, drafts and non-default locales
 * are never rewritten.
 */

// The single locale we hide on this hostname. No leading/trailing slash.
const DEFAULT_LOCALE = 'en-in';

// Matches any "xx-xx" locale segment at the start of the path (e.g. /en-in, /hi-in).
const LOCALE_RE = /^\/[a-z]{2}-[a-z]{2}(?=\/|$)/;

const getExtension = (path) => {
  const basename = path.split('/').pop();
  const pos = basename.lastIndexOf('.');
  return (basename === '' || pos < 1) ? '' : basename.slice(pos + 1);
};

const isMediaRequest = (url) => /\/media_[0-9a-f]{40,}[/a-zA-Z0-9_-]*\.[0-9a-z]+$/.test(url.pathname);
const isRUMRequest = (url) => /\/\.(rum|optel)\/.*/.test(url.pathname);

// A "page" request is a document or fragment: no extension (e.g. /personal/...)
// or an .html/.plain.html document. Everything else (js, css, json, images,
// fonts, media, etc.) is an asset served from the project root and must NOT be
// locale-prefixed.
const isPageRequest = (url) => {
  const ext = getExtension(url.pathname);
  return ext === '' || ext === 'html';
};

// Does this path already start with any locale segment?
const hasLocalePrefix = (pathname) => LOCALE_RE.test(pathname);

const handleRequest = async (request, env, ctx) => {
  const url = new URL(request.url);
  if (url.port) {
    // Cloudflare opens a couple more ports than 443, so we redirect visitors
    // to the default port to avoid confusion.
    // https://developers.cloudflare.com/fundamentals/reference/network-ports/#network-ports-compatible-with-cloudflares-proxy
    const redirectTo = new URL(request.url);
    redirectTo.port = '';
    return new Response('Moved permanently to ' + redirectTo.href, {
      status: 301,
      headers: {
        location: redirectTo.href
      }
    });
  }

  if (url.pathname.startsWith('/drafts/')) {
    return new Response('Not Found', { status: 404 });
  }

  if(isRUMRequest(url)) {
    // only allow GET, POST, OPTIONS
    if(!['GET', 'POST', 'OPTIONS'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 });
    }
  }

  // ---- LOCALE PREFIX HANDLING -------------------------------------------
  // 1) If a page request explicitly targets the DEFAULT locale, 301 to the
  //    clean URL so the prefix-free version is canonical.
  if (isPageRequest(url) && (
    url.pathname === `/${DEFAULT_LOCALE}` || url.pathname.startsWith(`/${DEFAULT_LOCALE}/`)
  )) {
    const cleaned = url.pathname.slice(`/${DEFAULT_LOCALE}`.length) || '/';
    const redirectTo = new URL(request.url);
    redirectTo.pathname = cleaned;
    return new Response('Moved permanently to ' + redirectTo.href, {
      status: 301,
      headers: { location: redirectTo.href },
    });
  }

  // 2) For prefix-free page requests, transparently prepend the default locale
  //    when talking to the origin. Non-default locales (/hi-in/...) already
  //    carry a prefix and pass through untouched.
  let localeRewritten = false;
  if (isPageRequest(url) && !hasLocalePrefix(url.pathname)) {
    url.pathname = `/${DEFAULT_LOCALE}${url.pathname === '/' ? '' : url.pathname}`;
    localeRewritten = true;
  }
  // -----------------------------------------------------------------------

  const extension = getExtension(url.pathname);

  // remember original search params
  const savedSearch = url.search;

  // sanitize search params
  const { searchParams } = url;
  if (isMediaRequest(url)) {
    for (const [key] of searchParams.entries()) {
      if (!['format', 'height', 'optimize', 'width'].includes(key)) {
        searchParams.delete(key);
      }
    }
  } else if (extension === 'json') {
    for (const [key] of searchParams.entries()) {
      if (!['limit', 'offset', 'sheet'].includes(key)) {
        searchParams.delete(key);
      }
    }
  } else {
    // neither media nor json request: strip search params
    url.search = '';
  }
  searchParams.sort();

  url.hostname = env.ORIGIN_HOSTNAME;
  if (!url.origin.match(/^https:\/\/main--.*--.*\.(?:aem|hlx)\.live/)) {
    return new Response('Invalid ORIGIN_HOSTNAME', { status: 500 });
  }
  const req = new Request(url, request);
  req.headers.set('x-forwarded-host', req.headers.get('host'));
  req.headers.set('x-byo-cdn-type', 'cloudflare');
  if (env.PUSH_INVALIDATION !== 'disabled') {
    req.headers.set('x-push-invalidation', 'enabled');
  }
  if (env.ORIGIN_AUTHENTICATION) {
    req.headers.set('authorization', `token ${env.ORIGIN_AUTHENTICATION}`);
  }
  let resp = await fetch(req, {
    method: req.method,
    cf: {
      // cf doesn't cache html by default: need to override the default behavior
      cacheEverything: true,
    },
  });
  resp = new Response(resp.body, resp);
  if (resp.status === 301 && savedSearch) {
    const location = resp.headers.get('location');
    if (location && !location.match(/\?.*$/)) {
      resp.headers.set('location', `${location}${savedSearch}`);
    }
  }
  if (resp.status === 304) {
    // 304 Not Modified - remove CSP header
    resp.headers.delete('Content-Security-Policy');
  }
  resp.headers.delete('age');
  resp.headers.delete('x-robots-tag');

  // ---- OUTBOUND REWRITE --------------------------------------------------
  // Strip the default-locale prefix from same-origin links and SEO tags so the
  // user never sees /en-in/ while navigating. Only run on HTML responses that
  // came from a locale-rewritten request path.
  const contentType = resp.headers.get('content-type') || '';
  if (localeRewritten && contentType.includes('text/html')) {
    resp = new HTMLRewriter()
      .on('a[href]', new AttrLocaleStripper('href'))
      .on('link[rel="canonical"]', new AttrLocaleStripper('href'))
      .on('link[rel="alternate"]', new AttrLocaleStripper('href'))
      .on('meta[property="og:url"]', new AttrLocaleStripper('content'))
      .transform(resp);
  }
  // Also fix Location redirects coming from the origin that carry the prefix.
  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get('location');
    if (loc) resp.headers.set('location', stripDefaultLocale(loc));
  }
  // -----------------------------------------------------------------------

  return resp;
};

// Removes a leading /en-in (or /en-in/...) from a URL or path string, leaving
// absolute external URLs and other locales untouched.
function stripDefaultLocale(value) {
  const prefix = `/${DEFAULT_LOCALE}`;
  // Handle absolute URLs (rewrite only the path component).
  try {
    const u = new URL(value);
    if (u.pathname === prefix || u.pathname.startsWith(`${prefix}/`)) {
      u.pathname = u.pathname.slice(prefix.length) || '/';
      return u.toString();
    }
    return value;
  } catch {
    // relative path
    if (value === prefix || value.startsWith(`${prefix}/`)) {
      return value.slice(prefix.length) || '/';
    }
    return value;
  }
}

// HTMLRewriter handler that strips the default locale from a given attribute.
class AttrLocaleStripper {
  constructor(attr) {
    this.attr = attr;
  }

  element(el) {
    const val = el.getAttribute(this.attr);
    if (val) {
      const stripped = stripDefaultLocale(val);
      if (stripped !== val) el.setAttribute(this.attr, stripped);
    }
  }
}

export default {
  fetch: handleRequest,
};
