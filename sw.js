const CACHE_NAME = "barcode-app-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  // On met en cache les librairies externes pour qu'elles marchent offline !
  "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
];

// 1. Installation du Service Worker et mise en cache des fichiers
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Mise en cache des fichiers");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation (Nettoyage des anciens caches si on change de version)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Interception des requêtes (Mode Offline)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si le fichier est dans le cache, on le sert (Offline)
      // Sinon, on le demande à Internet
      return response || fetch(event.request);
    })
  );
});
