/**
 * The only thing this service worker does (at the moment)
 * is forward push notifications. This might change later.
 */
/// <reference lib="webworker" />
// If I get this to work with ts, uncomment that
// declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.text() : 'no payload';
  event.waitUntil(
    self.registration.showNotification('ChargerAuth', {
      body: payload,
    })
  ); 
});
