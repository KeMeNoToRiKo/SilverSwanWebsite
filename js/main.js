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
  // the hero vial and Fig. 3 follow along: their liquid uses --level, their
  // text uses data-level="lv|sg|ph", or name1/name2 for the status on two lines
  const [first, ...rest] = d.name.split(" ");
  const text = { ...d, name1: first, name2: rest.join(" ") };
  document.documentElement.style.setProperty("--level", d.hex);
  document.querySelectorAll("[data-level]").forEach(n => { n.textContent = text[n.dataset.level]; });
}

swatches.forEach(s => {
  s.addEventListener("click", () => select(Number(s.dataset.i)));
});
select(1);

// arrow keys, Home and End step through the levels
const STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
document.querySelector(".swatches").addEventListener("keydown", e => {
  const i = swatches.indexOf(document.activeElement);
  if (i < 0) return;
  let next;
  if (e.key in STEP) next = Math.min(Math.max(i + STEP[e.key], 0), swatches.length - 1);
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = swatches.length - 1;
  else return;
  e.preventDefault();
  swatches[next].focus();
  select(next);
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Nav: mark the link for the section crossing the middle of the window. */
const navLinks = new Map();
document.querySelectorAll('.nav a[href^="#"]').forEach(a => {
  const section = document.querySelector(a.hash);
  if (section) navLinks.set(section, a);
});
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const a = navLinks.get(entry.target);
    if (entry.isIntersecting) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}, { rootMargin: "-45% 0px -54% 0px" });
navLinks.forEach((a, section) => spy.observe(section));

/* Results: the headline figures count up from zero the first time they're seen.
   The real value is in the HTML, so without JavaScript nothing changes. */
if (!reduceMotion) {
  const counter = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      counter.unobserve(entry.target);
      const node = entry.target;
      const text = node.textContent;
      const [, num, unit] = text.match(/^([\d.]+)(.*)$/) || [];
      if (!num) return;
      const target = Number(num);
      const places = (num.split(".")[1] || "").length;
      const start = performance.now();
      const tick = now => {
        const t = Math.min((now - start) / 1200, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        node.textContent = t < 1 ? (target * eased).toFixed(places) + unit : text;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
  document.querySelectorAll(".fig__n").forEach(n => counter.observe(n));
}

/* Citation: copy the APA reference in one click. */
const copyBtn = document.querySelector(".cite__copy");
if (copyBtn && navigator.clipboard) {
  copyBtn.hidden = false;
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el("cite-text").textContent.replace(/\s+/g, " ").trim());
      copyBtn.textContent = "Copied";
    } catch (e) {
      // clipboard blocked: select the text so Ctrl/Cmd+C works
      getSelection().selectAllChildren(el("cite-text"));
      copyBtn.textContent = "Press ⌘/Ctrl+C";
    }
    copyBtn.classList.add("is-done");
    setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("is-done"); }, 2000);
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
