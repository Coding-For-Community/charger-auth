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

// let deferredPrompt;
// self.addEventListener('beforeinstallprompt', (e) => {
//   // Prevent the mini-infobar from appearing on mobile
//   e.preventDefault();
  
//   // Stash the event so it can be triggered later.
//   deferredPrompt = e;
  
//   // Update UI to notify the user they can install the PWA
//   console.log('PWA is installable!');
//   installButton.style.display = 'block';
// });

// console.log("SKDFJLS")

// self.addEventListener("message", async () => {
//   console.log("SKLDJFLDJS")
//   // Hide the app provided install promotion  
//   // Show the install prompt
//   deferredPrompt.prompt();
  
//   // Wait for the user to respond to the prompt
//   const { outcome } = await deferredPrompt.userChoice;
  
//   console.log(`User response to the install prompt: ${outcome}`);
  
//   // We've used the prompt, and can't use it again, throw it away
//   deferredPrompt = null;
// })

