/* App shell only: private MP3 files and IndexedDB are never cached here. */
const CACHE = "otsutome-shell-v16";
const BASE = self.registration.scope;
const SHELL = [BASE, new URL("index.html",BASE).href, new URL("manifest.webmanifest",BASE).href, new URL("icon.svg",BASE).href, new URL("gentle-decoration.svg",BASE).href];
const OPTIONAL_ARTWORK = [new URL("gentle-footer.png",BASE).href,new URL("gentle-leaves.png",BASE).href];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(SHELL);
    await Promise.allSettled(OPTIONAL_ARTWORK.map(url => cache.add(url)));
  }));
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
  if (OPTIONAL_ARTWORK.includes(url.href)) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req,copy)));
      }
      return response;
    })));
    return;
  }
  if (!SHELL.includes(url.href)) return;
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
