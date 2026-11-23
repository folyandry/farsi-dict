/*
 * Farsi Dict service worker
 * Compatible with the GitHub Pages path: /farsi-dict/
 *
 * Cache strategy:
 * - App shell/navigation: network first, cached app fallback offline.
 * - Same-origin static files: network first, cached copy on failure.
 * - External Google Fonts: cache first, then network.
 *
 * User vocabulary is stored by the app in localStorage. This worker never
 * clears or rewrites localStorage; it only manages Cache Storage.
 */

const CACHE_PREFIX = 'fa-dict-';
const CACHE_VERSION = 'v58';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cachedOrNetwork(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-cache' });

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });

    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./index.html', response.clone());
    }

    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request))
      || (await cache.match('./index.html'))
      || Response.error();
  }
}

async function handleExternalAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);

  // Google Fonts may return CORS or opaque responses depending on the asset.
  if (response && (response.ok || response.type === 'opaque')) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(cachedOrNetwork(request));
    return;
  }

  // Cache external font stylesheets and font files for offline rendering.
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(handleExternalAsset(request));
  }
});
