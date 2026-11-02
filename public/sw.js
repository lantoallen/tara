// Tara's service worker. It keeps tickets working with no signal: pages under
// /tickets are saved on the device when they're opened (My tickets saves every
// upcoming ticket), and when the network is down the saved copy is shown.
// Nothing else is kept. src/lib/offline-tickets.ts is the page side of this.

const PAGES = "tara-tickets-v1";
const FILES = "tara-ticket-files-v1";

// At a venue the signal is often there but barely. After this long with no
// answer, the saved copy is shown instead of a page that never finishes loading.
const WAIT_FOR_NETWORK_MS = 4000;

// The ticket page and My tickets put this on what they show. A signed-out
// visit gets a page without it, and that isn't worth saving.
const MARKER = "data-keep-offline";

const isTicketPage = (path) => path === "/tickets" || /^\/tickets\/[A-Za-z0-9]+$/.test(path);

// The styles, fonts, and header photo a saved page needs to look right. The
// fonts in use are the ones the page preloads. The scripts aren't saved: a
// saved ticket is shown as a plain page.
const isPageFile = (path) => path === "/taal-lake.avif" || (path.startsWith("/_next/static/") && !path.endsWith(".js"));
const filesIn = (text) => new Set(text.match(/\/_next\/static\/[^"'()\s\\]+\.(?:css|woff2?|avif|png|svg|jpe?g|webp)|\/taal-lake\.avif/g));

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Lets the browser start fetching a page while this worker wakes up.
      await self.registration.navigationPreload?.enable();
      for (const name of await caches.keys()) {
        if (name.startsWith("tara-") && name !== PAGES && name !== FILES) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(isTicketPage(url.pathname) ? ticketPage(event, url.pathname) : otherPage(event));
  } else if (isPageFile(url.pathname)) {
    event.respondWith(savedOrNetwork(request));
  }
});

// Pages ask for tickets to be saved: the ticket page for itself, and My
// tickets for every upcoming one (`only` drops the rest).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "save") return;
  const reply = (saved) => event.ports[0]?.postMessage({ saved });
  event.waitUntil(saveTickets(event.data.paths, event.data.only).then(reply, () => reply(0)));
});

async function fromNetwork(event) {
  return (await event.preloadResponse) ?? fetch(event.request);
}

// The network first, so the ticket is up to date, then the saved copy if
// there's no connection or it's taking too long.
async function ticketPage(event, path) {
  const network = fromNetwork(event);
  event.waitUntil(network.then((res) => keepOrForget(path, res.clone())).catch(() => {}));
  const saved = await caches.match(path, { cacheName: PAGES });
  if (!saved) return network;
  const tooSlow = new Promise((_, fail) => setTimeout(fail, WAIT_FOR_NETWORK_MS));
  try {
    return await Promise.race([network, tooSlow]);
  } catch {
    return offlineCopy(saved);
  }
}

async function otherPage(event) {
  try {
    return await fromNetwork(event);
  } catch (err) {
    // No connection, and this page isn't one that's saved. Send them to their
    // saved tickets if there are any.
    if (await caches.match("/tickets", { cacheName: PAGES })) return Response.redirect("/tickets", 302);
    throw err;
  }
}

async function savedOrNetwork(request) {
  return (await caches.match(request, { cacheName: FILES })) ?? fetch(request);
}

// The saved page, minus its scripts, with a note that it's the saved copy.
async function offlineCopy(saved) {
  const html = await saved.text();
  const when = new Date(saved.headers.get("x-saved-at")).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const note = `<p class="offline-note" role="status">No connection right now, so this is the copy saved on this device on ${when}.</p>`;
  const page = html.replace(/<script\b[^>]*\ssrc=[^>]*><\/script>/g, "").replace("</body>", `${note}</body>`);
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// Saves a ticket page that came back with tickets on it. One that came back
// signed out means this device shouldn't keep anyone's tickets any more.
async function keepOrForget(path, res) {
  if (!res.ok) return false;
  const html = await res.text();
  if (html.includes(MARKER)) {
    await saveFiles(html);
    const page = new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "x-saved-at": new Date().toISOString() },
    });
    await (await caches.open(PAGES)).put(path, page);
    return true;
  }
  if (html.includes("/login?next=")) await forgetAll();
  return false;
}

async function saveFiles(text) {
  const files = await caches.open(FILES);
  for (const file of filesIn(text)) {
    if (await files.match(file)) continue;
    const res = await fetch(file).catch(() => null);
    if (res?.ok) await files.put(file, res);
  }
}

async function saveTickets(paths, only) {
  let saved = 0;
  for (const path of paths) {
    if (!isTicketPage(path)) continue;
    const res = await fetch(path).catch(() => null);
    if (res && (await keepOrForget(path, res))) saved++;
  }
  if (only) await dropAllBut(paths);
  return saved;
}

// Drops saved tickets that aren't coming up any more, and any files left over
// from older versions of the site that no saved page uses.
async function dropAllBut(paths) {
  const pages = await caches.open(PAGES);
  const files = await caches.open(FILES);
  const needed = new Set();
  for (const request of await pages.keys()) {
    if (!paths.includes(new URL(request.url).pathname)) {
      await pages.delete(request);
      continue;
    }
    for (const file of filesIn(await (await pages.match(request)).text())) needed.add(file);
  }
  for (const request of await files.keys()) {
    if (!needed.has(new URL(request.url).pathname)) await files.delete(request);
  }
}

async function forgetAll() {
  await caches.delete(PAGES);
  await caches.delete(FILES);
}
