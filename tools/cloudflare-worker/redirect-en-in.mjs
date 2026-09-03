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
 * REDIRECT-ONLY WORKER — pairs with AEM config-service path mapping
 * ---------------------------------------------------------------------------
 * The path mapping (config service public.json) already maps
 *   /content/kotakbankedsue/en-in/  ->  /
 * so the origin serves clean, prefix-free URLs natively. No inbound rewrite is
 * needed here anymore.
 *
 * This Worker's ONLY extra job is to 301 the OLD prefixed URLs to the clean
 * ones, because a blanket /en-in/* redirect is a wildcard and the AEM redirects
 * sheet does not support wildcards (they must be done at the CDN).
 *
 *   GET /en-in/personal/accounts/saving-account
 *     -> 301 /personal/accounts/saving-account
 *
 * Everything else passes through unchanged to the standard Adobe origin proxy.
 */

const DEFAULT_LOCALE = 'en-in';

const getExtension = (path) => {
  const basename = path.split('/').pop();
  const pos = basename.lastIndexOf('.');
  return (basename === '' || pos < 1) ? '' : basename.slice(pos + 1);
};

const isMediaRequest = (url) => /\/media_[0-9a-f]{40,}[/a-zA-Z0-9_-]*\.[0-9a-z]+$/.test(url.pathname);
const isRUMRequest = (url) => /\/\.(rum|optel)\/.*/.test(url.pathname);

const handleRequest = async (request, env, ctx) => {
  const url = new URL(request.url);
  if (url.port) {
    const redirectTo = new URL(request.url);
    redirectTo.port = '';
    return new Response('Moved permanently to ' + redirectTo.href, {
      status: 301,
      headers: { location: redirectTo.href },
    });
  }

  // ---- 301 old prefixed URLs to clean URLs -------------------------------
  const prefix = `/${DEFAULT_LOCALE}`;
  if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
    const redirectTo = new URL(request.url);
    redirectTo.pathname = url.pathname.slice(prefix.length) || '/';
    return new Response('Moved permanently to ' + redirectTo.href, {
      status: 301,
      headers: { location: redirectTo.href },
    });
  }
  // -----------------------------------------------------------------------

  if (url.pathname.startsWith('/drafts/')) {
    return new Response('Not Found', { status: 404 });
  }

  if(isRUMRequest(url)) {
    if(!['GET', 'POST', 'OPTIONS'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 });
    }
  }

  const extension = getExtension(url.pathname);
  const savedSearch = url.search;

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
    cf: { cacheEverything: true },
  });
  resp = new Response(resp.body, resp);
  if (resp.status === 301 && savedSearch) {
    const location = resp.headers.get('location');
    if (location && !location.match(/\?.*$/)) {
      resp.headers.set('location', `${location}${savedSearch}`);
    }
  }
  if (resp.status === 304) {
    resp.headers.delete('Content-Security-Policy');
  }
  resp.headers.delete('age');
  resp.headers.delete('x-robots-tag');
  return resp;
};

export default {
  fetch: handleRequest,
};
