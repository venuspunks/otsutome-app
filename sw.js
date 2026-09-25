/* App shell only: private MP3 files and IndexedDB are never cached here. */
const CACHE = "otsutome-shell-v12";
const BASE = self.registration.scope;
const SHELL = [BASE, new URL("index.html",BASE).href, new URL("manifest.webmanifest",BASE).href, new URL("icon.svg",BASE).href, new URL("gentle-decoration.svg",BASE).href];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("otsutome-shell-") && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(new URL("index.html",BASE).href,copy)));
      }
      return response;
    }).catch(() => caches.match(new URL("index.html",BASE).href).then(r => r || Response.error())));
    return;
  }
  if (!SHELL.includes(url.href)) return;
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
