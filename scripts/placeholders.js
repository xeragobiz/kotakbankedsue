/*
 * Global placeholders utility
 * ---------------------------
 * Single source of truth for global values authored in /placeholders.json
 * (e.g. sitename, interestrate, customercare).
 *
 * Two ways to consume:
 *   1. In JS:      import { getPlaceholders } from '../scripts/placeholders.js';
 *   2. In content: authors type {{key}} anywhere; replacePlaceholderTokens()
 *                  swaps it for the value at render time.
 *
 * The sheet is fetched ONCE and cached (module-level promise), so any number of
 * blocks/calls share a single network request.
 */

let placeholdersPromise;

/**
 * Fetch and flatten the placeholders sheet into a { key: value } map (cached).
 * @returns {Promise<Object>} map of placeholder key -> value
 */
export async function getPlaceholders() {
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

// Matches a single {{ key }} token; key is word chars, dots or hyphens.
// NOT global — used with String.replace(new RegExp(..., 'g')) locally so there is
// no shared lastIndex state to corrupt matching across calls.
const TOKEN_SOURCE = '\\{\\{\\s*([\\w.-]+)\\s*\\}\\}';

const hasToken = (str) => new RegExp(TOKEN_SOURCE).test(str || '');

/**
 * Replace {{key}} tokens in the text nodes under `root` with placeholder values.
 * Unknown keys are left untouched so nothing breaks. Only touches text nodes, so
 * markup/attributes are never affected.
 * @param {Element} root the container to scan (defaults to document.body)
 */
export async function replacePlaceholderTokens(root = document.body) {
  if (!root) return;
  // Quick bail-out: nothing to do if there are no tokens in the subtree.
  if (!hasToken(root.textContent)) return;

  const placeholders = await getPlaceholders();

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (hasToken(node.nodeValue)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });

  const targets = [];
  let current = walker.nextNode();
  while (current) {
    targets.push(current);
    current = walker.nextNode();
  }

  targets.forEach((node) => {
    // Fresh global regex per replace — no shared lastIndex.
    node.nodeValue = node.nodeValue.replace(
      new RegExp(TOKEN_SOURCE, 'g'),
      (match, key) => (
        Object.prototype.hasOwnProperty.call(placeholders, key) ? placeholders[key] : match
      ),
    );
  });
}
