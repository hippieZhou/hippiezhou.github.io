self.addEventListener("fetch", (event) => {
  if (!(event.request.url.indexOf("http") === 0)) return;

  event.respondWith(
    caches.open("cache").then(async (cache) => {
      const response = await cache.match(event.request);
      console.log("cache request: " + event.request.url);
      var fetchPromise = fetch(event.request).then(
        (networkResponse) => {
          console.log("fetch completed: " + event.request.url, networkResponse);
          if (networkResponse) {
            console.debug(
              "updated cached page: " + event.request.url,
              networkResponse
            );
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        },
        (event) => {
          console.log("Error in fetch()", event);
          event.waitUntil(
            caches.open("cache").then(function (cache_1) {
              return cache_1.addAll([
                "/",
                "/index.html",
                "/index.html?homescreen=1",
                "/?homescreen=1",
                "/assets/css/main.css",
                "/images/*",
              ]);
            })
          );
        }
      );
      return response || fetchPromise;
    })
  );
});

self.addEventListener("install", (event) => {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting();
  console.log("Latest version installed!");
});
