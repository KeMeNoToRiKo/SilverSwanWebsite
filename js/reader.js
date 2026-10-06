/* ------------------------------------------------------------------
   Manuscript reader (manuscript.html). Each page of the PDF has been
   rendered ahead of time to a WebP image (images/manuscript/, made by
   tools/render-pages.mjs), so the phone only has to show pictures: no
   PDF engine to download or run.

   - Pages scroll inside their own pane (#pages), separately from the
     website.
   - Only pages on or near the pane's screen get an image, more of them
     ahead (below) than behind. The browser picks the 800px or 1400px
     file to suit the screen and zoom.
   - Images more than KEEP pages away are dropped again, so a long read
     doesn't fill a small phone's memory.

   Page numbers are PDF pages (1–238), which is what the Contents links
   in manuscript.html point at (#page=N).
------------------------------------------------------------------ */
const KEY = "manuscript-page";           // where this visitor left off
const ZOOMS = [1, 1.25, 1.5, 2];         // multiples of "fit width"
const KEEP = 10;                         // page images kept either side of the current one
const GAP = 16;                          // space above a page after a jump (the pane's padding)
const WIDTHS = [800, 1400];              // image widths in images/manuscript/
const file = (n, w) => `images/manuscript/${String(n).padStart(3, "0")}-${w}.webp`;

const lite = document.documentElement.classList.contains("lite");
const el = id => document.getElementById(id);
const pagesBox = el("pages");
const pageInput = el("r-page");
const toc = el("toc");
const tocLinks = Array.from(toc.querySelectorAll('a[href^="#page="]'));
const pageOf = href => Number((href.match(/#page=(\d+)/) || [])[1]);

const load = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } };
const save = n => { try { localStorage.setItem(KEY, String(n)); } catch (e) {} };

const total = Number(pagesBox.dataset.pages);
const slots = [];
let current = 1, zoom = 0;
const slotOf = div => slots[div.dataset.n - 1];

/* ---------- page images ---------- */

// the width pages are shown at, so the browser picks the right file
const sizes = () => (slots[0] ? slots[0].el.clientWidth : pagesBox.clientWidth) + "px";

function show(slot) {
  if (slot.img) return;
  const img = new Image();
  img.alt = "";
  img.decoding = "async";
  img.fetchPriority = slot.n === current ? "high" : "low";
  img.sizes = sizes();
  img.srcset = WIDTHS.map(w => `${file(slot.n, w)} ${w}w`).join(", ");
  img.src = file(slot.n, WIDTHS[0]);
  img.onload = () => { slot.el.classList.remove("is-loading"); slot.el.classList.add("is-loaded"); };
  img.onerror = () => { slot.el.classList.remove("is-loading"); hide(slot); };   // tries again next time it's near
  slot.el.classList.add("is-loading");
  slot.el.append(img);
  slot.img = img;
}

function hide(slot) {
  if (!slot.img) return;
  slot.img.remove();
  slot.img = null;
  slot.el.classList.remove("is-loading", "is-loaded");
}

const hideFar = () => slots.forEach(s => { if (s.img && Math.abs(s.n - current) > KEEP) hide(s); });

// Load pages on or near the pane's screen: about two screens ahead, one behind
// (less on lite devices).
const near = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) show(slotOf(e.target)); });
}, { root: pagesBox, rootMargin: lite ? "50% 0px 100% 0px" : "100% 0px 200% 0px" });

/* ---------- where the reader is ---------- */

// the page crossing the upper third of the pane is the current one
const spot = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) setCurrent(slotOf(e.target).n); });
}, { root: pagesBox, rootMargin: "-30% 0px -69% 0px" });

function setCurrent(n) {
  current = n;
  if (document.activeElement !== pageInput) pageInput.value = n;
  save(n);
  history.replaceState(history.state, "", "#page=" + n);
  hideFar();

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
  n = Math.min(Math.max(Math.round(n) || 1, 1), total);
  pagesBox.scrollTo({ top: slots[n - 1].el.offsetTop - GAP, behavior: smooth && !lite ? "smooth" : "instant" });
  setCurrent(n);
}

/* ---------- zoom ---------- */

// Wider pages: the browser switches to the 1400px images by itself once the
// new width calls for them.
function setZoom(i) {
  const keep = current;
  zoom = Math.min(Math.max(i, 0), ZOOMS.length - 1);
  pagesBox.style.setProperty("--z", ZOOMS[zoom]);
  el("r-zoom").textContent = Math.round(ZOOMS[zoom] * 100) + "%";
  resize();
  goTo(keep);
}

const resize = () => { const s = sizes(); slots.forEach(slot => { if (slot.img) slot.img.sizes = s; }); };

/* ---------- start ---------- */

// One placeholder per page, all the same shape (US Letter), so jumps land exactly.
const frag = document.createDocumentFragment();
for (let n = 1; n <= total; n++) {
  const div = document.createElement("div");
  div.className = "page";
  div.dataset.n = n;
  div.setAttribute("role", "img");
  div.setAttribute("aria-label", "Page " + n);
  const label = document.createElement("span");
  label.className = "page__n";
  label.textContent = n;
  div.append(label);
  slots.push({ n, el: div, img: null });
  frag.append(div);
}
pagesBox.replaceChildren(frag);

// a #page=N link opens the pane at that page; the website stays at the top
const fromHash = pageOf(location.hash);
if (fromHash) goTo(fromHash);
slots.forEach(s => { near.observe(s.el); spot.observe(s.el); });

// offer to pick up where they left off
const last = load();
if (!fromHash && last > 1 && last <= total) {
  const resume = el("r-resume");
  resume.innerHTML = `<button type="button" class="reader__resume-btn">Continue from page ${last} <span aria-hidden="true">→</span></button>`;
  resume.hidden = false;
  resume.querySelector("button").addEventListener("click", () => { resume.hidden = true; goTo(last); });
}

/* ---------- controls ---------- */

// Contents links and any other #page=N link on the page
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#page="]');
  if (!a) return;
  e.preventDefault();
  if (toc.matches(":popover-open")) toc.hidePopover();
  goTo(pageOf(a.getAttribute("href")));
});
window.addEventListener("hashchange", () => { if (pageOf(location.hash)) goTo(pageOf(location.hash)); });

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
  if (zoom > 0 || e.target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1, true); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1, true); }
});

// keep the image size in step with the pane (rotation, window resize)
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 300); });

// Browsers without popover support: the Contents list just shows above the pages.
if (!HTMLElement.prototype.hasOwnProperty("popover")) document.documentElement.classList.add("no-popover");
