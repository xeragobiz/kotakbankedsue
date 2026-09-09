# JSON-LD Schema via the Metadata Sheet — Plan

**Goal:** Add `FinancialProduct` structured data (JSON-LD) to the account pages so it
appears in **raw view-source** and is picked up in the first crawl — driven from the
bulk metadata sheet (`/metadata.json`), not per-page.

> The metadata sheet is authored/published in AEM. This doc is the spec: the exact
> rows to enter. It is not applied by committing to this repo.

---

## How it works

- EDS supports a special metadata property named **`json-ld`**. Its value is rendered
  into the page `<head>` as:
  ```html
  <script type="application/ld+json"> … </script>
  ```
- In the **bulk metadata sheet**, a `URL` column holds a path pattern (`*`/`**`
  wildcards) and each other column is a metadata property. Add a **`json-ld`** column.
- Evaluated **top to bottom**; site-wide (`/**`) rows go first, specific rows below.
- **Precedence:** page-level metadata block > folder-mapped sheet > bulk `/metadata.json`.
- Mapping already in place: `/content/kotakbankedsue/metadata:/metadata.json`.

---

## ⚠️ Prerequisite — resolve the duplicate account URLs first

The site currently publishes two schemes for the same content:

```
/accounts/saving-account            /personal/accounts/saving-account
/accounts/salary-account            /personal/accounts/...
```

Schema `<loc>`/`url` and the sheet's `URL` pattern must target the **canonical** URL only
(the one that matches each page's `<link rel="canonical">`). Applying schema to both would
reinforce duplicate content. **Decide the canonical scheme before entering rows.**

---

## The metadata sheet rows

Columns: **`URL`** and **`json-ld`**. One row per account page (JSON-LD must be valid,
single-line in the cell).

| URL | json-ld |
| --- | --- |
| `/accounts/saving-account` | `{"@context":"https://schema.org","@type":"FinancialProduct","name":"Kotak Saving Account","category":"Savings Account","provider":{"@type":"BankOrCreditUnion","name":"Kotak Mahindra Bank"},"url":"https://www.kotak.bank.in/accounts/saving-account","annualPercentageRate":"6.8"}` |
| `/accounts/salary-account` | `{"@context":"https://schema.org","@type":"FinancialProduct","name":"Kotak Salary Account","category":"Salary Account","provider":{"@type":"BankOrCreditUnion","name":"Kotak Mahindra Bank"},"url":"https://www.kotak.bank.in/accounts/salary-account"}` |

> Wildcard alternative: a single `/accounts/*` row can't carry per-product values
> (name/rate differ), so JSON-LD is best as one row per page. Use `/accounts/**` only for
> shared, non-specific schema (e.g. Breadcrumb).

---

## Steps to apply (in AEM)

1. Open the **metadata** spreadsheet in AEM (mapped to `/metadata.json`).
2. Ensure a **`json-ld`** column exists (add it in Page Editor if missing).
3. Add the rows above (one per account page), pasting the JSON-LD into the `json-ld` cell.
4. **Preview + Publish** the metadata sheet.
5. The pages inherit the schema on their next render — no page edit needed.

---

## Verify

```bash
# Schema present in raw HTML (view-source)?
curl -s https://main--kotakbankedsue--xeragobiz.aem.live/accounts/saving-account \
  | grep -o 'application/ld+json'

# Full JSON-LD block
curl -s https://main--kotakbankedsue--xeragobiz.aem.live/accounts/saving-account \
  | grep -A2 'application/ld+json'
```

Then validate with:
- **Google Rich Results Test** — https://search.google.com/test/rich-results
- **Schema Markup Validator** — https://validator.schema.org
- Track impact in **Google Search Console → Enhancements** over 2–4 weeks (per Adobe's
  guidance — Google does not guarantee rich results even for valid schema).

---

## Notes / best practice (from aem.live/docs/schema-structured-data)

- **Page-based (metadata) schema is in the initial HTML** — right choice when you need it
  in the first crawl (product/offer pages). Block-based (JS-generated) may not appear in
  raw view-source.
- **Align schema with visible content** — mismatches risk manual penalties.
- Start page-based for quick iteration; move high-velocity/repeatable schema (FAQ, review)
  to block-based later if authoring scale demands it.

---

## Checklist

- [ ] Decide canonical account URL scheme (`/accounts/*` vs `/personal/accounts/*`)
- [ ] Confirm real values per product (name, category, APR) with the business
- [ ] Add `json-ld` column + rows to the metadata sheet in AEM
- [ ] Preview + Publish the metadata sheet
- [ ] Verify `application/ld+json` in raw view-source on each account page
- [ ] Validate with Google Rich Results Test + Schema Validator
- [ ] Confirm schema `url` matches each page's canonical
- [ ] Monitor GSC Enhancements for 2–4 weeks
