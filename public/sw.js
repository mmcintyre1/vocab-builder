const CACHE = "vocab-v2";

self.addEventListener("install", (event) => {
  // Only cache the manifest — not page routes (stale HTML breaks deploys)
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/manifest.json"))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API routes — network only, offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation requests (HTML pages) — network first, no caching
  // Cache-first here causes stale pages after deploys
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});
