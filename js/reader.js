/* ------------------------------------------------------------------
   Manuscript reader (manuscript.html). Draws the PDF with PDF.js, one
   page at a time, only near where the visitor is reading. The PDF is
   fetched in pieces (HTTP range requests), so opening page 120 doesn't
   download the 119 pages before it.

   Page numbers here are PDF pages (1–238), which is what the Contents
   links in manuscript.html point at (#page=N).
------------------------------------------------------------------ */
import * as pdfjs from "./vendor/pdfjs-4.10.38/pdf.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs-4.10.38/pdf.worker.min.mjs", import.meta.url).href;

const PDF_URL = "PBL3_Manuscript.pdf";
const KEY = "manuscript-page";           // where this visitor left off
const ZOOMS = [1, 1.25, 1.5, 2];         // multiples of "fit width"

const el = id => document.getElementById(id);
const pagesBox = el("pages");
const status = el("r-status");
const pageInput = el("r-page");
const toc = el("toc");
const tocLinks = Array.from(toc.querySelectorAll('a[href^="#page="]'));
const pageOf = href => Number((href.match(/#page=(\d+)/) || [])[1]);

const load = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } };
const save = n => { try { localStorage.setItem(KEY, String(n)); } catch (e) {} };

let pdf, slots = [], current = 1, zoom = 0;
const slotOf = div => slots[div.dataset.n - 1];

/* ---------- drawing pages ---------- */

// Draw one page into its slot, sharp for the screen's pixel density.
async function draw(slot) {
  if (slot.state) return;
  slot.state = "drawing";
  try {
    const page = await pdf.getPage(slot.n);
    const base = page.getViewport({ scale: 1 });
    const cssWidth = slot.el.clientWidth;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(cssWidth * density, 2400) / base.width;
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
    if (e && e.name === "RenderingCancelledException") return;
    slot.state = "";
  }
}

// Free a page that's far off screen, so long reads don't pile up memory.
function release(slot) {
  if (!slot.state) return;
  if (slot.task) slot.task.cancel();
  slot.task = null;
  slot.state = "";
  slot.el.classList.remove("is-drawn");
  slot.el.replaceChildren(label(slot.n));
}

const label = n => {
  const s = document.createElement("span");
  s.className = "page__n";
  s.textContent = n;
  return s;
};

// Draw pages within about a screen and a half; free them past three screens.
const near = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) draw(slotOf(e.target)); });
}, { rootMargin: "150% 0px" });
const far = new IntersectionObserver(entries => {
  entries.forEach(e => { if (!e.isIntersecting) release(slotOf(e.target)); });
}, { rootMargin: "300% 0px" });

/* ---------- where the reader is ---------- */

// the page crossing the upper third of the window is the current one
const spot = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) setCurrent(slotOf(e.target).n); });
}, { rootMargin: "-30% 0px -69% 0px" });

function setCurrent(n) {
  current = n;
  if (document.activeElement !== pageInput) pageInput.value = n;
  save(n);
  history.replaceState(history.state, "", "#page=" + n);

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

function goTo(n, smooth) {
  n = Math.min(Math.max(Math.round(n) || 1, 1), slots.length);
  slots[n - 1].el.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });
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
    const slot = { n, el: div, state: "", task: null };
    slots.push(slot);
    frag.append(div);
  }
  pagesBox.replaceChildren(frag);

  // a #page=N link lands on that page; otherwise start at the top, intro showing
  const fromHash = pageOf(location.hash);
  if (fromHash) goTo(fromHash);
  slots.forEach(s => { near.observe(s.el); far.observe(s.el); spot.observe(s.el); });

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

// redraw when the column width changes a lot (rotation, window resize)
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
