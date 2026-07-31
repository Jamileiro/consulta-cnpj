/* ConsultaCNPJ - Service Worker */
const CACHE = "ccnpj-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./static/css/tailwind.min.css",
  "./static/css/style.css",
  "./static/js/app.js",
  "./manifest.json",
  "./static/img/icon-192.png",
  "./static/img/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Não interceptar chamadas para a API externa (publica.cnpj.ws)
  if (e.request.url.indexOf("publica.cnpj.ws") !== -1) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
</content>

