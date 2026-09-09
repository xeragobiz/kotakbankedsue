/*
 * Placeholder Demo block
 * ----------------------
 * The author enters a single-line text value: a key from the placeholders sheet
 * (published at /placeholders.json), e.g. "sitename". The block looks that key
 * up and renders its value (e.g. "Kotak Bank").
 *
 * placeholders.json shape:
 *   { "data": [ { "sitename": "Kotak Bank", "interestrate": "6.8%", ... } ] }
 */

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
  // The authored single-line text is the placeholder key.
  const key = (block.textContent || '').trim();
  block.textContent = '';

  const out = document.createElement('p');
  out.className = 'placeholder-demo-value';

  if (!key) {
    out.textContent = 'No placeholder key provided.';
    block.append(out);
    return;
  }

  const placeholders = await getPlaceholders();
  if (Object.prototype.hasOwnProperty.call(placeholders, key)) {
    out.textContent = placeholders[key];
  } else {
    out.textContent = `Unknown placeholder: ${key}`;
  }
  block.append(out);
}
