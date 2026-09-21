# Silver Swan — RFID landing page

Static site. No build step, no dependencies, no framework.

```
silver-swan-site/
├── index.html           page markup
├── css/
│   └── styles.css       all styles
├── js/
│   ├── main.js          hydration scale + manuscript button (home page only)
│   └── theme.js         light/dark toggle (every page)
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
  760px tall, sized to fit the longest bio. If a bio gets much longer, raise
  that number in the `min-height` media query at the bottom of `css/styles.css`.
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

## Light and dark theme

The site follows the visitor's system setting (light or dark) by default. The
sun/moon button in the header switches themes; the choice is remembered in the
browser and carries across pages. Switching back to whatever the system uses
clears the saved choice, so the site follows the system again.

- **Colors:** both palettes are the variables at the top of `css/styles.css`. The
  dark palette appears twice there (once for "system is dark", once for "visitor
  picked dark"), so edit both blocks together.
- **New pages** need the same two lines in `<head>` as the existing ones:
  `<script src="js/theme.js"></script>` (no `defer`, so there is no flash of the
  wrong theme) and the stylesheet, plus the `theme-toggle` button in the header.
