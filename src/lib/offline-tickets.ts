// The page side of public/sw.js, the service worker that keeps tickets
// working with no signal.

// Development builds don't get it, since saved pages would hide code changes.
// One left over from a production build on the same address is removed.
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") {
    void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister()));
    return;
  }
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
}

// Asks the service worker to save these pages. With `only`, saved tickets not
// in the list are dropped. Resolves to how many were saved, or 0 when this
// browser can't.
export async function saveForOffline(paths: string[], { only = false } = {}): Promise<number> {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return 0;
  try {
    // Registering again just returns the existing one. It also covers a page
    // asking before the layout has registered it on the first visit.
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    const { active } = await navigator.serviceWorker.ready;
    const reply = active && (await ask(active, { type: "save", paths, only }, 60_000));
    return reply?.saved ?? 0;
  } catch {
    return 0;
  }
}

// Deletes every saved ticket, for when someone logs out or a different person
// signs in on this device. It goes through the service worker so a save that's
// still running can't put them back, then clears what's here too in case there
// isn't one.
export async function forgetSavedTickets() {
  if (!("caches" in window)) return;
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration?.active) await ask(registration.active, { type: "forget" }, 2000);
  for (const name of await caches.keys()) {
    if (name.startsWith("tara-")) await caches.delete(name);
  }
}

// Sends the service worker a message and waits for its answer, giving up after
// `wait` ms so logging out never hangs on it.
function ask(worker: ServiceWorker, message: object, wait: number): Promise<{ saved?: number } | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), wait);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    worker.postMessage(message, [channel.port2]);
  });
}
