# Silver Swan — RFID landing page

Static site. No build step, no dependencies, no framework.

```
silver-swan-site/
├── index.html           page markup
├── manuscript.html      manuscript reader, served at /manuscript
├── 404.html             "Off the scale" page for unknown addresses
├── css/
│   └── styles.css       all styles
├── js/
│   ├── main.js          hydration scale, nav highlight, citation (home page only)
│   ├── arrival.js       RFID / QR / link greeting (home page only)
│   ├── reader.js        manuscript reader (manuscript.html only)
│   ├── theme.js         light/dark toggle (every page)
│   └── vendor/pdfjs-*/  PDF.js, Mozilla's PDF renderer (reader only)
├── team/                one profile page per member (resume + socials)
├── images/
│   ├── team/            one square portrait per member
│   ├── icons.svg        social-link logos
│   ├── logo-*.png       swan logo: header mark + footer badge, light and dark
│   ├── favicon-*.png    browser tab and home-screen icons
│   ├── demo-poster*.jpg thumbnail shown before the demo video plays
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

The site is live at `https://silver-swan-website.vercel.app`. Write that URL to
the NFC/RFID tag as a URL record, with `?via=rfid` on the end. Add a custom domain
under Project → Settings → Domains if you want something shorter to read out
loud during the defense (then see "Link previews" below).

## RFID, QR code or typed link

The greeting at the top of the page changes with how the visitor got there. The
card and the QR code each carry their own tag on the end of the address:

| Way in        | Address to use                                     | Greeting                                      |
| ------------- | -------------------------------------------------- | --------------------------------------------- |
| RFID card     | `https://silver-swan-website.vercel.app/?via=rfid` | You tapped the Silver Swan card. Welcome.     |
| QR code       | `https://silver-swan-website.vercel.app/?via=qr`   | You scanned the Silver Swan QR code. Welcome. |
| Anything else | `https://silver-swan-website.vercel.app`           | You found your way to Silver Swan. Welcome.   |

Point both at the home page (`/`), not `/index.html`.

- **How it works:** `js/arrival.js` reads the `via` tag, then removes it from the
  address bar so a link copied from there gets the plain greeting instead of
  "you tapped the card". The page remembers the answer for that browser tab, so a
  reload or a trip to a profile and back keeps the right greeting.
- **Typed vs. shared links:** a visit with no tag could be a typed address, a
  bookmark or a link someone sent, and a browser can't tell those apart. That's
  why the third greeting doesn't say which one it was.
- **Editing the wording:** the three lines are the `<span data-arrival="…">`
  elements inside `.hero__kicker` in `index.html`. Without JavaScript the
  "Anything else" line shows.

## Link previews

When the site is shared in Messenger, Facebook, LinkedIn, X or iMessage, the
card shows a title, description and image, set by the `og:` and `twitter:` tags
in each page's `<head>`. The home page uses the demo video thumbnail
(`images/demo-poster.jpg`); each profile uses that member's photo. These tags
need full addresses, so they spell out `https://silver-swan-website.vercel.app`,
as does each page's `canonical` link. If you move to a custom domain, replace it
in `index.html` and the four files in `team/`.

Platforms cache previews. After changing them, re-scrape with Facebook's
[Sharing Debugger](https://developers.facebook.com/tools/debug/) or LinkedIn's
[Post Inspector](https://www.linkedin.com/post-inspector/).

## Manuscript reader

"Read the manuscript" opens `/manuscript`, a reader with a Contents list
(sidebar on wide screens, a sheet from the Contents button on phones), a page
box to jump to any page, zoom, and a PDF download. The page in the address
updates as you read (`/manuscript#page=117`), so any page can be linked or
shared, and a returning visitor is offered "Continue from page N".

- **Its own scroll pane:** the pages scroll inside a framed pane about one
  window tall (`.viewer` / `.pages` in `css/styles.css`), so reading the
  document and scrolling the website are separate. You can scroll down to the
  footer and the document stays on its page. On wide screens, scrolling past the
  first or last page doesn't drag the website along. On phones it does, so a
  thumb that reaches the end carries on to the footer.
- **How it loads:** `js/reader.js` draws pages with PDF.js (self-hosted in
  `js/vendor/`, loaded only on this page) and fetches the PDF in pieces:
  - Only pages on or near the pane's screen are drawn. The page being read
    draws first, then its neighbors, two at a time. Pages skipped past quickly
    are never drawn.
  - When nothing is drawing, the next 3 pages in the reading direction (and 1
    behind) are fetched ahead but not drawn, so turning to them needs no
    network. Skipped when the browser asks to save data.
  - Drawn pages more than 6 away from the current one are freed to save memory.
  - These numbers are `AT_ONCE`, `AHEAD`, `BEHIND` and `KEEP` at the top of
    `js/reader.js`.

  Opening it costs about half a megabyte rather than the full 13 MB. Without
  JavaScript, or if it fails, the page shows a direct link to the PDF instead.
- **Contents page numbers** are PDF pages, not the printed ones: printed page N
  is PDF page N + 14 (Chapter 1 starts on PDF page 15). The list is plain links
  in `manuscript.html` (`href="#page=N"`). The home page also links into it: the
  Table 4.1 link under Fig. 1 and "Full evaluation in Chapter 4" under Results.
- **Replacing the PDF:** keep the name `PBL3_Manuscript.pdf`, then check the
  Contents page numbers and the page count and size shown in `index.html` and
  `manuscript.html`. The PDF was re-saved with its small internal objects packed
  together ("object streams"). Page content is unchanged, but it lets the reader
  open without scanning the whole file. A PDF exported straight from Word is laid
  out so the reader must fetch several MB before showing page 1. To repack a new
  export the same way: `qpdf --object-streams=generate in.pdf PBL3_Manuscript.pdf`,
  or open and save it with the `pdf-lib` npm package using `useObjectStreams: true`.
- **Updating PDF.js:** put the new `pdf.min.mjs` and `pdf.worker.min.mjs` from
  the `pdfjs-dist` package's `legacy/build/` folder (the legacy build also runs
  on older phones) in a new `js/vendor/pdfjs-<version>/` folder, and change the
  two paths at the top of `js/reader.js`. `vercel.json` caches that folder for a
  year, which is why the version is in the folder name.

## Citation

The Manuscript section ends with the APA 7 reference and a Copy button. The
text is `#cite-text` in `index.html`; edit it there if the title or URL changes.

## Editing content

Page text lives in `index.html` and styles in `css/styles.css`. The eight
hydration levels (colors, SG ranges, HSV centroids) are in the `LEVELS` array in
`js/main.js` — those values come from Table 4.1 of the manuscript, so keep them
in sync if the table changes. The swatch colors in `index.html` (`--c` on each
`.sw` button) must match the `hex` values in that array.

## Text size

The base size is one line at the top of `css/styles.css`:

```css
html{font-size:clamp(1.03rem,1rem + .2vw,1.1rem);}
```

It works out to roughly 16.7px on a phone and 17.6px on a desktop, and every
other size is in `rem`, so changing that line rescales the whole page. It is set
in `rem` rather than `px` so a visitor who has enlarged text in their browser
still gets it.

## Demo video

The YouTube demonstration is Fig. 2 in the System section (`id="demo"`), and the
"Watch the demonstration" link in the hero jumps to it. Until someone presses
play it is only a thumbnail (`images/demo-poster.jpg`), so the page loads nothing
from YouTube up front. Pressing play loads the player in place from
youtube-nocookie.com, YouTube's privacy-enhanced domain. Without JavaScript the
thumbnail is a plain link to the video on YouTube.

To swap in a different video, change the video ID (`-ihNrsX2kaU`) in the
`data-youtube` attribute and both YouTube links, update the 5:31 length in the
caption and the hero link, and replace the two poster images with the new
video's thumbnail (`https://i.ytimg.com/vi/<ID>/maxresdefault.jpg`, plus a
640px-wide copy).

## Team section

Each member is an `<li class="member">` in `index.html` with a photo, name, role,
short overview and skills line. Clicking a card opens that member's profile page
in `team/` (`ingal.html`, `ombrog.html`, `sabulao.html`, `sangkula.html`), which
has their resume and social links. The resumes and photos come from
Appendix P (Researchers Profile) of the manuscript.

- **Photos** live in `images/team/`. To swap one, drop in a square image with the
  same filename. Any size works; 400×400 or larger looks sharp.
- **Editing a profile:** edit that member's file in `team/` directly. Name and
  role also appear on the home page card and in the "Other members" list at the
  bottom of the other three profiles, so change those too.
- **Profile layout:** on wide screens the photo, bio and socials sit in a sidebar
  that stays pinned while the resume scrolls. It only pins on windows at least
  640px tall; if a bio is taller than the window, the sidebar scrolls on its own.
  To change that cut-off, edit the `min-height` media query near the bottom of
  `css/styles.css`.
- **Clickable cards:** the name on each home page card is wrapped in
  `<a class="member__link">`. That link makes the whole card the click target
  and adds the hover arrow; remove it and the card goes back to plain text.
- **Adding a social link:** in the member's file in `team/`, copy one `<li>` from
  the `socials` list and change three things: `data-net` and the icon name after
  `icons.svg#` (both one of `linkedin`, `github`, `briefcase`, `instagram`,
  `facebook`), the `href`, and the visible handle. Every profile has all five as
  examples. Icons live in `images/icons.svg` and turn their brand color on hover.
  They won't show if you open the HTML file directly from disk; use a local
  server (e.g. VS Code Live Server) or the deployed site.
- **Contact details:** phone numbers, home addresses and emails from the resumes
  are deliberately left off. Add them only if the member wants them public.

## Logo

The swan badge appears in three places, all cut from the original square artwork:

- **Header mark** next to "Silver Swan" — `logo-swan-disc.png` (swan on a dark
  disc) on the light theme, `logo-swan.png` (plain silver swan) on dark. The
  silver swan alone is too faint on the pale background, and the disc would
  disappear on the dark one.
- **Footer seal** — the full badge with its "URINO · SILVER SWAN" ring:
  `logo-badge.png` on light, `logo-badge-dark.png` on dark, where the ring
  lettering is lightened so it stays readable.
- **Favicon and home-screen icon** — `favicon-32.png` and `favicon-180.png`, both
  the disc version so it shows up on light and dark browser tabs alike.

Which file each spot uses is set by the `--logo-mark` and `--logo-badge`
variables at the top of `css/styles.css`, so swapping artwork means replacing the
PNGs or pointing those variables somewhere else. The ring lettering is too small
to read at header size, which is why the header uses the swan on its own.

## Visual details

Everything here is plain CSS plus a few lines in `js/main.js`, with no libraries.

- **Hydration stripe:** the eight scale colors as one gradient, `--scale` at the
  top of `css/styles.css`. It runs along the footer's top edge and, as a scroll
  progress bar, along the bottom of the header.
- **Sticky header:** stays pinned and frosted while scrolling. Its height is
  `--head-h`, which also offsets anchor jumps, the sticky section labels and the
  profile sidebar so nothing slides under it. Change it if the header's height changes.
- **Scroll motion:** blocks rise in, bars fill, and the progress stripe grows,
  all through CSS scroll-driven animations. Browsers without them (Firefox for
  now) and visitors with reduced motion turned on get the static page with every
  bar drawn at full value.
- **Results bars:** each bar's length is the `--v` on its inner `<span>` in
  `index.html`. The table bars show sensor error against the 10% limit (right
  edge = 10%), so 7.72% is `--v:77.2%`. Keep them in step with the numbers.
- **Count-up:** `js/main.js` counts the three headline figures up from zero the
  first time they scroll into view, reading the target from the text itself.
- **Nav highlight:** the header link for the section in view is underlined in
  the accent color (`aria-current`, set in `js/main.js`).
- **Hydration scale keys:** after tabbing to a level, arrow keys, Home and End
  move between levels.
- **Picked level everywhere:** picking a level in Fig. 1 sets `--level` on the
  page, and the hero's sample tube, the sample in Fig. 3 and the phone in Fig. 3
  all take that color. Text marked `data-level="lv|sg|ph|name1|name2"` inside
  them is filled from the `LEVELS` array in `js/main.js`.
- **Fig. 3 device diagram:** an inline SVG in the System section of
  `index.html`. It's a schematic, not to scale; callouts 1–4 match the four
  stage cards below it. Part labels hide on phones, where they'd be too small.
  Colors come from the theme variables, apart from the matte-black inside of the
  enclosure, which stays dark in both themes.
- **Hero sample tube:** shown under the headline on wide screens only.
- **Closing quote:** "Thanks be to God.", Silver Swan's motto, opens every
  page's footer (`.footer__quote`). New pages should copy the whole footer.
- **404 page:** `404.html`, which Vercel serves for any unknown address. It uses
  absolute paths (`/css/styles.css`) because it can appear at any depth.

## Light and dark theme

The site follows the visitor's system setting (light or dark) by default. The
sun/moon button in the header switches themes; the choice is remembered in the
browser and carries across pages. Switching back to whatever the system uses
clears the saved choice, so the site follows the system again.

- **Colors:** both palettes are the variables at the top of `css/styles.css`. The
  dark palette appears twice there (once for "system is dark", once for "visitor
  picked dark"), so edit both blocks together.
- **Hero glow:** the warm wash behind the headline is `--glow` / `--glow-a`
  (color and strength), set per theme.
- **New pages** need the same two lines in `<head>` as the existing ones:
  `<script src="js/theme.js"></script>` (no `defer`, so there is no flash of the
  wrong theme) and the stylesheet, plus the `theme-toggle` button in the header.
