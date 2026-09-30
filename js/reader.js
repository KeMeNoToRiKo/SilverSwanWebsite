/* ------------------------------------------------------------------
   Manuscript reader (manuscript.html). Draws the PDF with PDF.js inside
   its own scrolling pane (#pages), so reading the document and
   scrolling the website are independent.

   Loading, cheapest first:
   - The PDF is fetched in pieces (HTTP range requests), so opening
     page 120 doesn't download the 119 pages before it.
   - Only pages on or near the pane's screen are drawn, two at a time,
     nearest to the page being read first.
   - When nothing is drawing, the next few pages in the direction of
     reading are fetched ahead (not drawn), so turning to them doesn't
     wait on the network.
   - Drawn pages more than KEEP pages away are freed again.

   Page numbers here are PDF pages (1–238), which is what the Contents
   links in manuscript.html point at (#page=N).
------------------------------------------------------------------ */
import * as pdfjs from "./vendor/pdfjs-4.10.38/pdf.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs-4.10.38/pdf.worker.min.mjs", import.meta.url).href;

const PDF_URL = "PBL3_Manuscript.pdf";
const KEY = "manuscript-page";           // where this visitor left off
const ZOOMS = [1, 1.25, 1.5, 2];         // multiples of "fit width"
const AT_ONCE = 2;                       // pages drawn at the same time
const AHEAD = 3, BEHIND = 1;             // pages fetched ahead / behind the reading direction
const KEEP = 6;                          // drawn pages kept either side of the current one
const GAP = 16;                          // space above a page after a jump (the pane's padding)

const el = id => document.getElementById(id);
const pagesBox = el("pages");
const status = el("r-status");
const pageInput = el("r-page");
const toc = el("toc");
const tocLinks = Array.from(toc.querySelectorAll('a[href^="#page="]'));
const pageOf = href => Number((href.match(/#page=(\d+)/) || [])[1]);
const saveData = !!(navigator.connection && navigator.connection.saveData);

const load = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } };
const save = n => { try { localStorage.setItem(KEY, String(n)); } catch (e) {} };

let pdf, slots = [], current = 1, direction = 1, zoom = 0;
const slotOf = div => slots[div.dataset.n - 1];

/* ---------- drawing pages ---------- */

const nearby = new Set();    // pages on or near the pane's screen
let drawing = 0;

// Start drawing the wanted pages, nearest to the current page first.
// Pages scrolled away from before their turn are simply never picked.
function pump() {
  // the page being read draws on its own first, so it appears soonest
  const limit = slots[current - 1] && slots[current - 1].state !== "drawn" ? 1 : AT_ONCE;
  while (drawing < limit) {
    let next = null;
    nearby.forEach(n => {
      const s = slots[n - 1];
      if (!s.state && (!next || Math.abs(n - current) < Math.abs(next.n - current))) next = s;
    });
    if (!next) break;
    drawing++;
    draw(next).finally(() => { drawing--; pump(); });
  }
  if (!drawing) prefetch();
}

// Draw one page into its slot, sharp for the screen's pixel density.
async function draw(slot) {
  slot.state = "drawing";
  try {
    const page = await pdf.getPage(slot.n);
    const base = page.getViewport({ scale: 1 });
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(slot.el.clientWidth * density, 2400) / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    slot.task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
    await slot.task.promise;
    slot.task = null;
    if (slot.state !== "drawing") return;          // released while drawing
    slot.el.replaceChildren(canvas);
    slot.el.classList.add("is-drawn");
    slot.state = "drawn";
  } catch (e) {
    if (slot.state === "drawing") slot.state = "";
  }
}

// Free a drawn page, so long reads don't pile up memory.
function release(slot) {
  if (!slot.state) return;
  if (slot.task) slot.task.cancel();
  slot.task = null;
  slot.state = "";
  slot.el.classList.remove("is-drawn");
  slot.el.replaceChildren(label(slot.n));
}

const releaseFar = () => slots.forEach(s => { if (s.state && Math.abs(s.n - current) > KEEP) release(s); });

const label = n => {
  const s = document.createElement("span");
  s.className = "page__n";
  s.textContent = n;
  return s;
};

// Fetch the next pages ahead of the reader without drawing them: this pulls
// their pieces of the PDF (text, fonts, images) into the worker, so drawing
// them later needs no network. One at a time, and it gives way to drawing.
const fetched = new Set();
let prefetching = false;
async function prefetch() {
  // only once the page being read is on screen
  if (prefetching || saveData || !pdf || !slots.length || slots[current - 1].state !== "drawn") return;
  prefetching = true;
  const wanted = [];
  for (let i = 1; i <= AHEAD; i++) wanted.push(current + direction * i);
  for (let i = 1; i <= BEHIND; i++) wanted.push(current - direction * i);
  for (const n of wanted) {
    if (drawing) break;
    if (n < 1 || n > slots.length || fetched.has(n) || slots[n - 1].state) continue;
    fetched.add(n);
    try {
      const page = await pdf.getPage(n);
      await page.getOperatorList();
      page.cleanup();
    } catch (e) {}
  }
  prefetching = false;
}

// which pages are on, or within a screen of, the pane's visible area
const near = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const n = slotOf(e.target).n;
    if (e.isIntersecting) nearby.add(n); else nearby.delete(n);
  });
  pump();
}, { root: pagesBox, rootMargin: "100% 0px" });

/* ---------- where the reader is ---------- */

// the page crossing the upper third of the pane is the current one
const spot = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) setCurrent(slotOf(e.target).n); });
}, { root: pagesBox, rootMargin: "-30% 0px -69% 0px" });

function setCurrent(n) {
  if (n !== current) direction = n > current ? 1 : -1;
  current = n;
  if (document.activeElement !== pageInput) pageInput.value = n;
  save(n);
  history.replaceState(history.state, "", "#page=" + n);
  releaseFar();
  pump();

  // highlight the last Contents entry that starts on or before this page
  let hit = null;
  tocLinks.forEach(a => { if (pageOf(a.getAttribute("href")) <= n) hit = a; });
  tocLinks.forEach(a => a.removeAttribute("aria-current"));
  if (hit) {
    hit.setAttribute("aria-current", "true");
    // keep it in view inside the sidebar without moving the page
    const top = hit.offsetTop - toc.clientHeight / 3;
    if (hit.offsetTop < toc.scrollTop || hit.offsetTop > toc.scrollTop + toc.clientHeight - 40) toc.scrollTop = top;
  }
}

// Scroll the pane (never the website) to a page.
function goTo(n, smooth) {
  n = Math.min(Math.max(Math.round(n) || 1, 1), slots.length);
  pagesBox.scrollTo({ top: slots[n - 1].el.offsetTop - GAP, behavior: smooth ? "smooth" : "instant" });
  setCurrent(n);
}

/* ---------- zoom ---------- */

function setZoom(i) {
  zoom = Math.min(Math.max(i, 0), ZOOMS.length - 1);
  pagesBox.style.setProperty("--z", ZOOMS[zoom]);
  el("r-zoom").textContent = Math.round(ZOOMS[zoom] * 100) + "%";
  redrawAll();
}

// After the page width changes, redraw at the new size and stay on the same page.
function redrawAll() {
  const keep = current;
  slots.forEach(s => { release(s); near.unobserve(s.el); });
  nearby.clear();
  goTo(keep);
  slots.forEach(s => near.observe(s.el));
}

/* ---------- start ---------- */

async function start() {
  status.textContent = "Loading the manuscript…";

  // Range requests, no background download of the whole file.
  pdf = await pdfjs.getDocument({ url: PDF_URL, disableAutoFetch: true, disableStream: true }).promise;
  const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
  el("r-total").textContent = pdf.numPages;

  // One placeholder per page, sized like page 1 so jumps land in the right place.
  const frag = document.createDocumentFragment();
  for (let n = 1; n <= pdf.numPages; n++) {
    const div = document.createElement("div");
    div.className = "page";
    div.style.aspectRatio = first.width + " / " + first.height;
    div.setAttribute("role", "img");
    div.setAttribute("aria-label", "Page " + n);
    div.append(label(n));
    div.dataset.n = n;
    slots.push({ n, el: div, state: "", task: null });
    frag.append(div);
  }
  pagesBox.replaceChildren(frag);

  // a #page=N link opens the pane at that page; the website stays at the top
  const fromHash = pageOf(location.hash);
  if (fromHash) goTo(fromHash);
  slots.forEach(s => { near.observe(s.el); spot.observe(s.el); });

  // offer to pick up where they left off
  const last = load();
  if (!fromHash && last > 1 && last <= pdf.numPages) {
    const resume = el("r-resume");
    resume.innerHTML = `<button type="button" class="reader__resume-btn">Continue from page ${last} <span aria-hidden="true">→</span></button>`;
    resume.hidden = false;
    resume.querySelector("button").addEventListener("click", () => { resume.hidden = true; goTo(last); });
  }
}

/* ---------- controls ---------- */

// Contents links and any other #page=N link on the page
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#page="]');
  if (!a || !slots.length) return;
  e.preventDefault();
  if (toc.matches(":popover-open")) toc.hidePopover();
  // jump straight there: a smooth scroll would draw every page on the way
  goTo(pageOf(a.getAttribute("href")));
});
window.addEventListener("hashchange", () => { if (slots.length && pageOf(location.hash)) goTo(pageOf(location.hash)); });

document.querySelectorAll("[data-step]").forEach(b => {
  b.addEventListener("click", () => goTo(current + Number(b.dataset.step), true));
});
document.querySelectorAll("[data-zoom]").forEach(b => {
  b.addEventListener("click", () => setZoom(zoom + Number(b.dataset.zoom)));
});

pageInput.addEventListener("change", () => goTo(Number(pageInput.value)));
pageInput.addEventListener("focus", () => pageInput.select());
pageInput.addEventListener("keydown", e => { if (e.key === "Enter") { goTo(Number(pageInput.value)); pageInput.blur(); } });

// ← and → turn pages (unless typing in the page box, or zoomed in, where they pan)
document.addEventListener("keydown", e => {
  if (!slots.length || zoom > 0 || e.target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1, true); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1, true); }
});

// redraw when the pane's width changes a lot (rotation, window resize)
let lastWidth = pagesBox.clientWidth, resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (slots.length && Math.abs(pagesBox.clientWidth - lastWidth) > 40) {
      lastWidth = pagesBox.clientWidth;
      redrawAll();
    }
  }, 300);
});

// Browsers without popover support: the Contents list just shows above the pages.
if (!HTMLElement.prototype.hasOwnProperty("popover")) document.documentElement.classList.add("no-popover");

start().catch(() => {
  status.innerHTML = 'The reader couldn’t load the manuscript. <a href="PBL3_Manuscript.pdf">Open the PDF directly</a> instead.';
});
