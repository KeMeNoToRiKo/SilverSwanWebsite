# Silver Swan — RFID landing page

Static site. No build step, no dependencies, no framework.

```
silver-swan-site/
├── index.html           page markup
├── css/
│   └── styles.css       all styles
├── js/
│   └── main.js          hydration scale + manuscript button
├── images/
│   ├── team/            one square portrait per member
│   └── manuscript-cover.png
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

At the top of `js/main.js`:

```js
const MANUSCRIPT_URL = "/PBL3_Manuscript.pdf";
```

Leave it as-is to serve the PDF from the site itself. Replace it with a Google
Drive share link if you would rather host the file there. Empty string disables
the button and shows a fallback message instead.

## Editing content

Page text lives in `index.html` and styles in `css/styles.css`. The eight
hydration levels (colors, SG ranges, HSV centroids) are in the `LEVELS` array in
`js/main.js` — those values come from Table 4.1 of the manuscript, so keep them
in sync if the table changes. The swatch colors in `index.html` (`--c` on each
`.sw` button) must match the `hex` values in that array.

## Team section

Each member is an `<li class="member">` in `index.html` with a photo, name, role,
short overview and skills line. The overviews and photos come from Appendix P
(Researchers Profile) of the manuscript.

- **Photos** live in `images/team/`. To swap one, drop in a square image with the
  same filename. Any size works; 400×400 or larger looks sharp.
- **Making a card clickable:** wrap the name in a link. The whole card becomes the
  click target and gets a hover arrow, with no extra CSS needed:

  ```html
  <h3 class="member__name"><a class="member__link" href="team/ingal.html">Ian B. Ingal</a></h3>
  ```
