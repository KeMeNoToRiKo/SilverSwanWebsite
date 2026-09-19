# Silver Swan — RFID landing page

Static site. No build step, no dependencies, no framework.

```
silver-swan-site/
├── index.html           the whole page (HTML + CSS + JS in one file)
├── PBL3_Manuscript.pdf  served at /PBL3_Manuscript.pdf
└── vercel.json          tells Vercel this is a static site
```

## Deploy (drag and drop, no Git)

1. Install the CLI once: `npm i -g vercel`
2. From inside this folder: `vercel` — answer the prompts, accept the defaults.
3. Ship it live: `vercel --prod`

The URL it prints is what the RFID card should point to.

## Deploy (GitHub)

1. Push this folder to a new repo.
2. vercel.com → Add New → Project → import the repo.
3. Framework Preset: **Other**. Leave build command and output directory empty.
4. Deploy.

## Point the RFID card at it

Vercel gives you something like `silver-swan.vercel.app`. Write that URL to the
NFC/RFID tag as a URL record. Add a custom domain under Project → Settings →
Domains if you want something shorter to read out loud during the defense.

## Changing the manuscript link

Near the bottom of `index.html`:

```js
const MANUSCRIPT_URL = "/PBL3_Manuscript.pdf";
```

Leave it as-is to serve the PDF from the site itself. Replace it with a Google
Drive share link if you would rather host the file there. Empty string disables
the button and shows a fallback message instead.

## Editing content

Everything lives in `index.html`. The eight hydration levels (colors, SG ranges,
HSV centroids) are in the `LEVELS` array in the script at the bottom — those
values come from Table 4.1 of the manuscript, so keep them in sync if the table
changes.
