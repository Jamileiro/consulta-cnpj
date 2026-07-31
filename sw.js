/* ConsultaCNPJ - Service Worker */
const CACHE = "ccnpj-v3";
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

  // Estratégia network-first: sempre buscar da rede primeiro para garantir
  // que os usuários recebam a versão mais recente. Usa cache apenas offline.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(e.request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (e.request.mode === "navigate")
            return caches.match("./index.html");
          return Response.error();
        }),
      ),
  );
});
