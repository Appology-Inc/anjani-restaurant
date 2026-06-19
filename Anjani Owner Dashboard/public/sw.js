self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline | Anjani Owner</title><style>body{background:#05050A;color:#fff;font-family:sans-serif;text-align:center;padding:50px;margin:0;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;}h1{color:#FF5A00;font-size:2.5rem;margin-bottom:10px;}p{color:#A0A5B5;font-size:1.1rem;}</style></head><body><h1>Anjani Owner</h1><p>You are currently offline. Please check your internet connection.</p></body></html>",
        {
          headers: { "Content-Type": "text/html" }
        }
      );
    })
  );
});
