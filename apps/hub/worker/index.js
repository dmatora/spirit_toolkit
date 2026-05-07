const APP_SHELL_CACHE = 'pages';
const APP_SHELL_ROUTES = [
  '/',
  '/rhythm',
  '/molitvoslov',
  '/journal',
  '/settings',
  '/molitvoslov/liturgy',
  '/molitvoslov/vespers',
  '/molitvoslov/morning_rule',
  '/molitvoslov/evening_rule',
  '/molitvoslov/pascha_hours',
  '/molitvoslov/three_canons',
  '/molitvoslov/communion_evening',
  '/molitvoslov/communion_morning',
  '/molitvoslov/communion',
  '/molitvoslov/gratitude',
  '/molitvoslov/akathist_baptist',
  '/molitvoslov/akathist_spiridon',
  '/molitvoslov/akathist_sergy',
  '/molitvoslov/akathist_luka',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);

      await Promise.all(
        APP_SHELL_ROUTES.map(async (url) => {
          try {
            const request = new Request(url, {
              credentials: 'same-origin',
              headers: {
                Accept: 'text/html',
              },
            });
            const response = await fetch(request);

            if (response.ok) {
              await cache.put(request, response);
            }
          } catch {
            // Installation should still complete if a warmup request is unavailable.
          }
        })
      );
    })()
  );
});
