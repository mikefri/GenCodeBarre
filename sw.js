const CACHE_NAME = 'gencodebarre-pwa-v1';

// Liste des ressources à mettre en cache (inclut les CDN et les polices)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  
  // Fichiers CSS et JS internes (votre code)
  // Remarque: le CSS est embarqué dans l'HTML, pas besoin de le lister ici
  
  // Librairies CDN (ajustez les chemins exacts si nécessaire)
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',

  // Polices externes
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcC73FpZKNlwpUfhzRDQJ-Lwmyh-qEzt02tP.woff2', // Exemple de fichier de police Inter
  // Note: Il est souvent difficile de trouver le chemin exact des fichiers woff2/ttf des polices Google. 
  // Une stratégie est d'utiliser 'Cache-First' pour toutes les requêtes, ou de lister ces chemins.
];

// Installation : Mise en cache des ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation : Suppression des anciens caches (mise à jour de la PWA)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch : Stratégie Cache-First
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - renvoie la réponse mise en cache
        if (response) {
          return response;
        }
        
        // Pas dans le cache - fait une requête réseau et met en cache pour la prochaine fois
        return fetch(event.request).then(
          response => {
            // Vérifie si la réponse est valide
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone la réponse pour la mettre dans le cache et l'utiliser
            const responseToCache = response.clone();
            
            // Ne pas mettre en cache les requêtes de données Excel non plus
            if (!event.request.url.includes('.xlsx') && !event.request.url.includes('.xls')) {
                 caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
            }

            return response;
          }
        );
      })
    );
});
