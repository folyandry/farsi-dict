'use strict';
const CACHE_PREFIX = 'fa-dict-';
const CACHE_NAME = 'fa-dict-v26';
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './fonts/inter-regular.otf', './fonts/inter-medium.otf', './fonts/inter-semibold.otf', './fonts/amiri-regular.ttf', './fonts/amiri-bold.ttf', './fonts/nastaliq-regular.ttf', './fonts/nastaliq-bold.ttf', './fonts/arabic-ui-regular.ttf', './fonts/arabic-ui-bold.ttf'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_FILES.map(path => cache.add(new Request(path, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin !== self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      } catch (error) {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone())).catch(() => {});
        return response;
      } catch (error) {
        return (await caches.match(request)) || (await caches.match('./index.html')) || new Response('Приложение пока не было сохранено для офлайн-работы. Откройте его с подключением к интернету.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      fetch(request).then(response => {
        if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {});
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {});
      return response;
    } catch (error) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
