# SEO Bulk Metadata Sheet (EN-IN / HI-IN)

Reference for building the **bulk metadata sheet** in Universal Editor. This is
**not** a code file — the actual sheet is authored in the content source (root
page named `metadata`, delivered as `/metadata.json`). This doc is the
column layout, row ordering, and values to enter.

## Key rules (from https://www.aem.live/docs/bulk-metadata)

1. **Processed top → bottom.** Site-wide `/**` MUST come first; more specific
   patterns (`/hi-in/**`, then `/hi-in/personal/**`) come after, so specific
   rows override the general ones.
2. **Wildcards:** `*` = prefix/suffix within a segment, `**` = whole subtree.
3. **Precedence:** page-level metadata (set on the page in UE) > bulk sheet.
   So authors can still override any individual page.
4. **UTF-8:** Devanagari (Hindi) text is entered directly in the cells.
5. Column header names are lower-cased into the HTML `<meta name="...">`.
   `title`/`description`/`keywords` map to the standard tags; `og:*` / `twitter:*`
   map to those properties; `lang` sets the document language.

## Column layout

| URL | title | description | keywords | lang | og:title | og:description | og:image | robots |
|-----|-------|-------------|----------|------|----------|----------------|----------|--------|

> Add/remove columns to taste. At minimum you want `URL`, `title`,
> `description`, `lang`. `og:*` default to `title`/`description` if omitted, so
> only set them where they should differ.

## Rows (in this exact order)

### 1. Site-wide default (English) — MUST be first
| Field | Value |
|-------|-------|
| URL | `/**` |
| title | `Kotak Bank` |
| description | `Kotak Mahindra Bank — savings accounts, salary accounts, and more.` |
| keywords | `Kotak, bank, savings account, salary account` |
| lang | `en-in` |
| og:image | `/default-meta-image.png` |
| robots | `index, follow` |

### 2. Hindi subtree default — after the site-wide row
| Field | Value |
|-------|-------|
| URL | `/hi-in/**` |
| title | `कोटक बैंक` |
| description | `कोटक महिंद्रा बैंक — बचत खाता, वेतन खाता और भी बहुत कुछ।` |
| keywords | `कोटक, बैंक, बचत खाता, वेतन खाता` |
| lang | `hi-in` |
| robots | `index, follow` |

> ⚠️ Hindi copy above is placeholder — replace with your team's approved
> translations. Only `lang: hi-in` and the `/hi-in/**` scoping are structural.

### 3. Section-level overrides (examples — add as needed)

English accounts section:
| Field | Value |
|-------|-------|
| URL | `/personal/accounts/**` |
| title | `Accounts | Kotak Bank` |
| description | `Open a Kotak savings or salary account online.` |

Hindi accounts section (must come AFTER `/hi-in/**`):
| Field | Value |
|-------|-------|
| URL | `/hi-in/personal/accounts/**` |
| title | `खाते | कोटक बैंक` |
| description | `कोटक बचत या वेतन खाता ऑनलाइन खोलें।` |

## Final row order (top to bottom)

```
/**                              ← English site-wide default (FIRST)
/personal/accounts/**            ← English section override
/hi-in/**                        ← Hindi subtree default
/hi-in/personal/accounts/**      ← Hindi section override (after /hi-in/**)
```

## Notes tying into existing config

- The query indexes already **exclude** `/metadata` and `/hi-in/metadata`
  (see `helix-query.yaml`), so the sheet itself never leaks into the sitemaps.
- The `en-in` query index captures a `lang` property from `<html lang>`, so the
  `lang` column here feeds that index and the hreflang story end-to-end.
- English is folder-mapped to root, so English rows use root paths (`/**`,
  `/personal/...`), **not** `/en-in/...`. Hindi keeps its visible `/hi-in/`
  prefix.

## How to create it

1. In Universal Editor, create a page named `metadata` at the site root.
2. Add a sheet/table with the columns above.
3. Enter the rows in the order shown; put real translated copy in the Hindi cells.
4. Preview + Publish. It is delivered at `/metadata.json`.
5. Verify: `curl -s https://www.kotak.bank.in/metadata.json` and check a Hindi
   page's `<title>` / `<meta name="description">` / `<html lang>` render in Hindi.
