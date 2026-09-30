/* ------------------------------------------------------------------
   How the visitor arrived, so the hero greets them to match.
   The RFID card and the QR code open the same address with a tag on
   the end:
     RFID card  →  https://<site>/?via=rfid
     QR code    →  https://<site>/?via=qr
   Anything else (typed, bookmarked, a shared link) gets the plain
   greeting. The result goes on <html data-arrival="rfid|qr|link"> and
   css/styles.css shows the matching line in .hero__kicker.

   Loaded without `defer` in <head> so the right greeting is there on
   the first paint.
------------------------------------------------------------------ */
{
  const PARAM = "via";
  const KEY = "arrival";
  const SOURCES = ["rfid", "qr"];

  const load = () => { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } };
  const save = value => {
    try { value ? sessionStorage.setItem(KEY, value) : sessionStorage.removeItem(KEY); } catch (e) {}
  };

  // a reload, back/forward, or a link from another page of this site
  const sameVisit = () => {
    const nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    if (nav && (nav.type === "reload" || nav.type === "back_forward")) return true;
    try { return new URL(document.referrer).origin === location.origin; } catch (e) { return false; }
  };

  const url = new URL(location.href);
  const tagged = (url.searchParams.get(PARAM) || "").trim().toLowerCase();
  let arrival;

  if (url.searchParams.has(PARAM)) {
    arrival = SOURCES.includes(tagged) ? tagged : "link";
    save(arrival === "link" ? null : arrival);
    // Drop the tag from the address bar, so a link copied from it
    // doesn't greet whoever opens it as if they had tapped the card.
    url.searchParams.delete(PARAM);
    try { history.replaceState(history.state, "", url.pathname + url.search + url.hash); } catch (e) {}
  } else if (sameVisit()) {
    // the tag is gone from the address by now; remember how this tab arrived
    const saved = load();
    arrival = SOURCES.includes(saved) ? saved : "link";
  } else {
    arrival = "link";
    save(null);
  }

  document.documentElement.dataset.arrival = arrival;
}
