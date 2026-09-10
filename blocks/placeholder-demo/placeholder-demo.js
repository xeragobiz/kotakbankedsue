/*
 * Placeholder Demo block
 * ----------------------
 * The author enters a single-line text value: a key from the placeholders sheet
 * (published at /placeholders.json), e.g. "sitename". The block looks that key
 * up and renders its value (e.g. "Kotak Bank").
 *
 * placeholders.json shape:
 *   { "data": [ { "sitename": "Kotak Bank", "interestrate": "6.8%", ... } ] }
 *
 * Also loads the external AOS (Animate On Scroll) library. loadCSS/loadScript
 * from aem.js DEDUPLICATE by href/src, so even with the block placed multiple
 * times on a page the CSS and JS each load only ONCE. The console logs below
 * make the request count observable — you'll see "requesting" fire per block
 * but the actual <link>/<script> is only appended the first time.
 */

import { loadCSS, loadScript } from '../../scripts/aem.js';

const AOS_CSS = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
const AOS_JS = 'https://unpkg.com/aos@2.3.1/dist/aos.js';

// Guard so the "loaded once" log is unambiguous even though loadCSS/loadScript
// already dedupe the actual DOM tags.
let aosPromise;

async function loadAOS() {
  // eslint-disable-next-line no-console
  console.log('[placeholder-demo] AOS requested by a block instance');
  if (!aosPromise) {
    // eslint-disable-next-line no-console
    console.log('[placeholder-demo] AOS not loaded yet -> loading CSS + JS now (first time only)');
    aosPromise = Promise.all([
      loadCSS(AOS_CSS),
      loadScript(AOS_JS),
    ]).then(() => {
      // eslint-disable-next-line no-console
      console.log('[placeholder-demo] AOS CSS + JS finished loading (once)');
      if (window.AOS) window.AOS.init();
    });
  } else {
    // eslint-disable-next-line no-console
    console.log('[placeholder-demo] AOS already loading/loaded -> reusing, no new request');
  }
  return aosPromise;
}

let placeholdersPromise;

// Fetch and flatten the placeholders sheet into a { key: value } map (once).
async function getPlaceholders() {
  if (!placeholdersPromise) {
    placeholdersPromise = fetch(`${window.hlx.codeBasePath}/placeholders.json`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => {
        const map = {};
        (json.data || []).forEach((row) => {
          Object.entries(row).forEach(([k, v]) => { map[k] = v; });
        });
        return map;
      })
      .catch(() => ({}));
  }
  return placeholdersPromise;
}

export default async function decorate(block) {
  // Load the external AOS library (deduped across all block instances).
  loadAOS();

  // The authored single-line text is the placeholder key.
  const key = (block.textContent || '').trim();
  block.textContent = '';

  // Lay the value out on the DLS grid: full width on mobile, half on tablet,
  // one third on desktop.
  const grid = document.createElement('div');
  grid.className = 'grid';
  const cell = document.createElement('div');
  cell.className = 'grid-col-12 grid-col-t-4 grid-col-d-4';

  const out = document.createElement('p');
  out.className = 'placeholder-demo-value';
  // AOS animation attribute — the library animates this on scroll.
  out.setAttribute('data-aos', 'fade-up');

  if (!key) {
    out.textContent = 'No placeholder key provided.';
  } else {
    const placeholders = await getPlaceholders();
    if (Object.prototype.hasOwnProperty.call(placeholders, key)) {
      out.textContent = placeholders[key];
    } else {
      out.textContent = `Unknown placeholder: ${key}`;
    }
  }

  cell.append(out);
  grid.append(cell);
  block.append(grid);
}
