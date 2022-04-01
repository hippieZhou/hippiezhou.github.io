// PWA Fire Bundle

// after a service worker is installed and the user navigates to a different page or
// refreshes,the service worker will begin to receive fetch events

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.open("cache").then(async (cache) => {
      const response = await cache.match(event.request);
      console.log("cache request: " + event.request.url);
      var fetchPromise = fetch(event.request).then(
        function (networkResponse) {
          // if we got a response from the cache, update the cache
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
          // rejected promise - just ignore it, we're offline!
          console.log("Error in fetch()", event);
          event.waitUntil(
            caches.open("cache").then(function (cache_1) {
              // our cache is named *cache* in the caches.open() above
              return cache_1.addAll([
                //cache.addAll(), takes a list of URLs, then fetches them from the server
                // and adds the response to the cache.
                // add your entire site to the cache- as in the code below; for offline access
                // If you have some build process for your site, perhaps that could
                // generate the list of possible URLs that a user might load.
                "/",
                "/index.html",
                "/index.html?homescreen=1",
                "/?homescreen=1",
                "/assets/css/main.css",
                "/images/*",

                // Do not replace/delete/edit the manifest.js paths below
                //These are links to the extenal social media buttons that should be cached;
                // we have used twitter's as an example
                "https://platform.twitter.com/widgets.js",
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
