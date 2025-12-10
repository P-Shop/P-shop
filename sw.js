const CACHE_NAME = 'pshop-v1.1.0';
const STATIC_CACHE = 'pshop-static-v1';
const DYNAMIC_CACHE = 'pshop-dynamic-v1';

// Fichiers critiques à mettre en cache immédiatement
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://i.postimg.cc/ZRscyVKS/b4beb632-78c8-4f8d-8491-02da1b2545ee.png'
];

// Ressources externes (CDN)
const EXTERNAL_RESOURCES = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.tailwindcss.com'
];

// ==================== INSTALLATION ====================
self.addEventListener('install', event => {
  console.log('🔧 [SW] Installation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Cache statique (fichiers critiques)
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 [SW] Mise en cache des fichiers statiques');
        return cache.addAll(URLS_TO_CACHE);
      }),
      
      // Cache externe (CDN - peut échouer sans bloquer)
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 [SW] Tentative de cache des ressources externes');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => 
            cache.add(url).catch(err => console.warn('⚠️ [SW] Échec cache:', url))
          )
        );
      })
    ])
    .then(() => {
      console.log('✅ [SW] Installation terminée');
      return self.skipWaiting(); // Active immédiatement
    })
  );
});

// ==================== ACTIVATION ====================
self.addEventListener('activate', event => {
  console.log('✅ [SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ [SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ [SW] Activation terminée');
      return self.clients.claim(); // Prend le contrôle immédiatement
    })
  );
});

// ==================== FETCH (Stratégie hybride) ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer Firebase (doit toujours passer par le réseau)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com')) {
    return;
  }

  // Stratégie: Cache First pour les ressources statiques
  if (URLS_TO_CACHE.includes(url.pathname) || 
      EXTERNAL_RESOURCES.includes(request.url)) {
    event.respondWith(cacheFirst(request));
  } 
  // Stratégie: Network First pour tout le reste
  else {
    event.respondWith(networkFirst(request));
  }
});

// ==================== STRATÉGIE: CACHE FIRST ====================
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('📦 [SW] Depuis cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache si réponse valide
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ [SW] Erreur réseau:', error);
    return offlineResponse(request);
  }
}

// ==================== STRATÉGIE: NETWORK FIRST ====================
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache si réponse valide
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📦 [SW] Réseau échoué, utilisation du cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return offlineResponse(request);
  }
}

// ==================== PAGE HORS LIGNE ====================
function offlineResponse(request) {
  // Si c'est une page HTML, afficher la page hors ligne
  if (request.destination === 'document') {
    return new Response(
      `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>P-Shop - Hors ligne</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f97316 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 48px 32px;
            text-align: center;
            color: white;
            max-width: 420px;
            border: 2px solid rgba(236, 72, 153, 0.5);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, #ec4899, #f97316);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 16px;
            font-weight: 800;
          }
          p {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 32px;
            line-height: 1.6;
          }
          button {
            background: linear-gradient(135deg, #ec4899, #f97316);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            font-size: 16px;
            transition: transform 0.2s;
            box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
          }
          button:hover { transform: scale(1.05); }
          button:active { transform: scale(0.95); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>Vous êtes hors ligne</h1>
          <p>P-Shop nécessite une connexion internet pour accéder aux dernières données et passer commande.</p>
          <button onclick="location.reload()">🔄 Réessayer la connexion</button>
        </div>
      </body>
      </html>`,
      { 
        headers: { 
          'Content-Type': 'text/html; charset=utf-8' 
        } 
      }
    );
  }

  // Pour les autres ressources, retourner une erreur 503
  return new Response('Service indisponible', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ==================== COMMUNICATION CLIENT ====================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Mise à jour forcée');
    self.skipWaiting();
  }
});
