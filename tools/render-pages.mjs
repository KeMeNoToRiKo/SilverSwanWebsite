/* ------------------------------------------------------------------
   Renders every page of PBL3_Manuscript.pdf to WebP images for the
   manuscript reader (images/manuscript/NNN-800.webp and NNN-1400.webp).
   Run it again whenever the PDF changes. It isn't part of the site and
   isn't deployed (see .vercelignore).

   It needs one npm package, kept out of the site. From any empty folder:

     npm i pdfjs-dist@4
     node /path/to/site/tools/render-pages.mjs /path/to/site

   The package is looked up from the folder you run it in. It brings its own
   canvas library (@napi-rs/canvas), which is used here as well, so the two
   always match.
------------------------------------------------------------------ */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const SITE = path.resolve(process.argv[2] || ".");
const PDF = path.join(SITE, "PBL3_Manuscript.pdf");
const OUT = path.join(SITE, "images/manuscript");
const WIDTHS = [800, 1400];   // phones use 800, large and zoomed screens 1400
const QUALITY = 72;           // WebP quality: text stays crisp, files stay small

const need = createRequire(path.join(process.cwd(), "noop.js"));
const pdfjsDir = path.dirname(need.resolve("pdfjs-dist/package.json"));
const pdfjs = await import(pathToFileURL(need.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
// the same canvas library PDF.js uses internally
const { createCanvas } = createRequire(path.join(pdfjsDir, "noop.js"))("@napi-rs/canvas");

const doc = await pdfjs.getDocument({
  data: new Uint8Array(fs.readFileSync(PDF)),
  standardFontDataUrl: path.join(pdfjsDir, "standard_fonts") + "/",
  cMapUrl: path.join(pdfjsDir, "cmaps") + "/",
  cMapPacked: true,
  verbosity: 0,
}).promise;

fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  for (const width of WIDTHS) {
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const file = await canvas.encode("webp", QUALITY);
    fs.writeFileSync(path.join(OUT, `${String(n).padStart(3, "0")}-${width}.webp`), file);
    bytes += file.length;
  }
  page.cleanup();
  if (n % 20 === 0 || n === doc.numPages) console.log(`page ${n}/${doc.numPages}, ${(bytes / 1e6).toFixed(1)} MB so far`);
}
console.log(`done: ${doc.numPages} pages × ${WIDTHS.length} widths in ${path.relative(SITE, OUT)}/`);
