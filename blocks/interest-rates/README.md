# Interest Rates block

Fetches Kotak deposit interest-rate data and renders it as a table.

- **API:** `GET https://www.kotak.bank.in/bank/mailers/intrates/get_all_variable_data_latest2t.php?section=<SECTION>`
- **Response:** JSON array of `[fromDays, toDays, generalRate, seniorRate]` rows.
- **Authoring:** one cell holding the section id (default `NRO_Term_Deposit`).

## ⚠️ CORS — read before testing

The API responds with `access-control-allow-origin: https://www.kotak.bank.in`.
A browser `fetch()` therefore only succeeds when the page is served from that
exact origin. Consequences:

- **Production (served on `www.kotak.bank.in`):** works with no changes (same-origin).
- **Local dev / `*.aem.live`:** the browser blocks reading the response. The block
  catches this and shows a friendly message; the console logs the CORS error.

## How to test locally (CORS-disabled)

1. Start the dev server serving the draft page:
   ```
   npx -y @adobe/aem-cli up --no-open --html-folder drafts
   ```
2. Open the test page with a browser that has CORS checks disabled, e.g. Chrome:
   ```
   # macOS example — use a throwaway profile
   open -na "Google Chrome" --args --user-data-dir=/tmp/chrome-nocors --disable-web-security
   ```
   Then visit `http://localhost:3000/interest-rates-test.html`.
3. You should see the rates table render. (In a normal browser you'll instead see
   the CORS message — that's expected and proves the block handles the failure.)

## Verifying the API independently (no browser/CORS)

```
curl -sG 'https://www.kotak.bank.in/bank/mailers/intrates/get_all_variable_data_latest2t.php' \
  --data-urlencode 'section=NRO_Term_Deposit'
```

## Production options if EDS is NOT on the Kotak origin

- Serve the EDS site same-origin on `www.kotak.bank.in` (no CORS — recommended).
- Or proxy the call server-side (Cloudflare Worker / BYOM) and return it with
  permissive CORS to the browser.
