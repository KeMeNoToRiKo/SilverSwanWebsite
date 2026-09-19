/* ------------------------------------------------------------------
   PBL3_Manuscript.pdf sits next to index.html, so Vercel serves it at
   the path below. Swap in a Google Drive link instead if you prefer.
------------------------------------------------------------------ */
const MANUSCRIPT_URL = "/PBL3_Manuscript.pdf";

const LEVELS = [
  { lv:"Level 1", name:"Diluted",                sg:"below 1.005", ph:"4.5–8.0", hsv:"57°, 7%, 98%",   hex:"#FAF9E9", note:"Pale and transparent. Fluid intake is more than adequate." },
  { lv:"Level 2", name:"Well Hydrated",          sg:"1.005–1.009", ph:"4.5–8.0", hsv:"55°, 17%, 100%", hex:"#FFFAD4", note:"Pale yellow. Fluid intake is adequate — keep drinking at the same rate." },
  { lv:"Level 3", name:"Minimal Dehydration",    sg:"1.010–1.014", ph:"4.5–8.0", hsv:"53°, 27%, 98%",  hex:"#F9F1B5", note:"Yellow. Slightly more fluid is needed." },
  { lv:"Level 4", name:"Minimal Dehydration",    sg:"1.015–1.019", ph:"4.5–8.0", hsv:"58°, 44%, 92%",  hex:"#EBE885", note:"Darker yellow. Increase fluid intake." },
  { lv:"Level 5", name:"Significant Dehydration",sg:"1.020–1.024", ph:"4.5–8.0", hsv:"52°, 56%, 88%",  hex:"#E0D462", note:"Amber. Drink two to three glasses of water now." },
  { lv:"Level 6", name:"Significant Dehydration",sg:"1.025–1.029", ph:"4.5–8.0", hsv:"52°, 75%, 85%",  hex:"#D9C336", note:"Dark amber. Rehydrate immediately." },
  { lv:"Level 7", name:"Serious Dehydration",    sg:"1.030–1.035", ph:"4.5–8.0", hsv:"43°, 70%, 80%",  hex:"#CBA13E", note:"Ochre amber. Urgent fluid replenishment is required." },
  { lv:"Level 8", name:"Serious Dehydration",    sg:"above 1.035", ph:"4.5–8.0", hsv:"43°, 70%, 64%",  hex:"#A38331", note:"Honey-brownish. Seek fluids and clinical advice without delay." }
];

const swatches = Array.from(document.querySelectorAll(".sw"));
const el = id => document.getElementById(id);

function select(i){
  const d = LEVELS[i];
  swatches.forEach((s, n) => s.setAttribute("aria-pressed", n === i ? "true" : "false"));
  el("r-dot").style.background = d.hex;
  el("r-name").textContent = d.name;
  el("r-lv").textContent = d.lv;
  el("r-sg").textContent = d.sg;
  el("r-ph").textContent = d.ph;
  el("r-hsv").textContent = d.hsv;
  el("r-hex").textContent = d.hex;
  el("r-note").textContent = d.note;
}

swatches.forEach(s => {
  s.addEventListener("click", () => select(Number(s.dataset.i)));
});
select(1);

const btn = el("manuscript-btn");
if (MANUSCRIPT_URL) {
  btn.href = MANUSCRIPT_URL;
  btn.target = "_blank";
  btn.rel = "noopener";
} else {
  btn.addEventListener("click", e => {
    e.preventDefault();
    el("btn-note").textContent = "The manuscript link isn't published yet — ask Team Silver Swan for a copy.";
  });
}

/* Demo video: the poster links to YouTube; pressing it loads the player in place
   (privacy-enhanced youtube-nocookie domain), so nothing loads until then. */
document.querySelectorAll("[data-youtube]").forEach(poster => {
  poster.addEventListener("click", e => {
    e.preventDefault();
    const player = document.createElement("iframe");
    player.src = `https://www.youtube-nocookie.com/embed/${poster.dataset.youtube}?autoplay=1&rel=0&playsinline=1`;
    player.title = poster.dataset.title;
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.allowFullscreen = true;
    poster.replaceWith(player);
    player.focus();
  });
});
