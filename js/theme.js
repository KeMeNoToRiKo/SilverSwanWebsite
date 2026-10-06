/* ------------------------------------------------------------------
   Light / dark theme. The page follows the system setting until the
   visitor presses the toggle; their pick is remembered across pages.
   Loaded without `defer` in <head> so a saved theme is applied before
   the first paint (no flash of the wrong theme).

   Also decides "lite" mode, for the same reason: low-end phones and
   data-saver visitors get class="lite" on <html>, which switches off
   the continuous effects in css/styles.css (header blur, scroll motion,
   looping animations). Lite is on when the browser reports data saver,
   a 2G/3G connection, or 4 GB of memory or less (Chrome on Android
   reports memory; iPhones and computers don't, so they keep everything).
   Add ?lite=1 or ?lite=0 to any address to force it either way; the
   choice is remembered in this browser.
------------------------------------------------------------------ */
{
  const KEY = "lite";
  const root = document.documentElement;
  const net = navigator.connection || {};
  let forced = null;
  try {
    const asked = new URLSearchParams(location.search).get("lite");
    if (asked === "1" || asked === "0") localStorage.setItem(KEY, asked);
    forced = localStorage.getItem(KEY);
  } catch (e) {}
  const lowEnd = !!net.saveData || /(^|-)2g|3g/.test(net.effectiveType || "") ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  if (forced === "1" || (forced !== "0" && lowEnd)) root.classList.add("lite");
}

{
  const KEY = "theme";
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PAPER = { light: "#f4f1e8", dark: "#131210" };

  const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = value => {
    try { value ? localStorage.setItem(KEY, value) : localStorage.removeItem(KEY); } catch (e) {}
  };
  const systemTheme = () => (systemDark.matches ? "dark" : "light");
  const currentTheme = () => root.dataset.theme || systemTheme();

  const saved = load();
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  // browser bar colour and the toggle's label follow whichever theme is showing
  const sync = () => {
    const theme = currentTheme();
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = PAPER[theme]; });
    document.querySelectorAll(".theme-toggle").forEach(b => {
      b.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  };

  // the theme the last click asked for; the cross-fade applies it a frame later,
  // so quick repeat clicks must toggle from this rather than from the page
  let requested = null;

  const toggle = () => {
    const next = (requested || currentTheme()) === "dark" ? "light" : "dark";
    requested = next;
    const apply = () => {
      if (requested === next) requested = null;
      // Picking the theme the system already uses clears the override,
      // so the page goes back to following the system setting.
      if (next === systemTheme()) {
        delete root.dataset.theme;
        save(null);
      } else {
        root.dataset.theme = next;
        save(next);
      }
      sync();
    };
    if (document.startViewTransition && !reduceMotion.matches && !root.classList.contains("lite")) document.startViewTransition(apply);
    else apply();
  };

  if (systemDark.addEventListener) systemDark.addEventListener("change", sync);
  else systemDark.addListener(sync);

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".theme-toggle").forEach(b => {
      b.hidden = false;   // hidden in the HTML so it never shows without this script
      b.addEventListener("click", toggle);
    });
    sync();
  });
}
