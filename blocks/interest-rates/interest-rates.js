/*
 * Interest Rates block
 * ---------------------
 * Fetches deposit interest-rate data from Kotak's public rates API and renders
 * it as an accessible table.
 *
 * API (GET): .../get_all_variable_data_latest2t.php?section=<SECTION>
 * Response:  JSON array of rows, each [fromDays, toDays, generalRate, seniorRate]
 *   e.g. [["7","14","2.75","3.25"], ["365","455","6.35","6.85"], ...]
 *
 * NOTE ON CORS: this endpoint sends `access-control-allow-origin:
 * https://www.kotak.bank.in`, so a browser fetch only succeeds when the page is
 * served from that same origin (production) — or during local testing with
 * browser CORS checks disabled. The API_BASE can be overridden per environment.
 */

const API_BASE = 'https://www.kotak.bank.in/bank/mailers/intrates/get_all_variable_data_latest2t.php';

// Authored content is expected as a single cell containing the section id,
// e.g. "NRO_Term_Deposit". Falls back to that default if empty.
function readConfig(block) {
  const cell = block.querySelector(':scope > div > div');
  const section = (cell?.textContent || '').trim() || 'NRO_Term_Deposit';
  return { section };
}

async function fetchRates(section) {
  const url = `${API_BASE}?section=${encodeURIComponent(section)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  // The endpoint returns JSON but with a text/html content-type, so parse text.
  const text = await resp.text();
  return JSON.parse(text);
}

function buildTable(rows) {
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Tenure (days)</th>
        <th scope="col">General (%)</th>
        <th scope="col">Senior Citizen (%)</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  rows.forEach(([fromDays, toDays, general, senior]) => {
    const tr = document.createElement('tr');
    const tenure = fromDays === toDays ? `${fromDays}` : `${fromDays} – ${toDays}`;
    tr.innerHTML = `<td>${tenure}</td><td>${general}</td><td>${senior}</td>`;
    tbody.append(tr);
  });
  return table;
}

export default async function decorate(block) {
  const { section } = readConfig(block);
  block.textContent = '';

  const status = document.createElement('p');
  status.className = 'interest-rates-status';
  status.textContent = 'Loading interest rates…';
  block.append(status);

  try {
    const rows = await fetchRates(section);
    if (!Array.isArray(rows) || rows.length === 0) {
      status.textContent = 'No interest-rate data available.';
      return;
    }
    status.remove();
    block.append(buildTable(rows));
  } catch (e) {
    // Most commonly a CORS failure when not served from the allowed origin.
    status.textContent = 'Unable to load interest rates. (If testing locally, this is likely CORS — see block docs.)';
    // eslint-disable-next-line no-console
    console.error('interest-rates fetch failed:', e);
  }
}
