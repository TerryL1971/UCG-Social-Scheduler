// public/sw.js - Enhanced Service Worker

const CACHE_NAME = 'ucg-scheduler-v2.1.0'
const RUNTIME_CACHE = 'ucg-runtime'
const IMAGE_CACHE = 'ucg-images'

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/ucg-logo.png',
  '/manifest.json'
]

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching files')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting()) // Activate immediately
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim()) // Take control immediately
  )
})

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome extensions and external domains
  if (!url.origin.includes(self.location.origin)) {
    return
  }

  // Handle API calls differently - always try network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache API responses
          return response
        })
        .catch(() => {
          // Return error response if offline
          return new Response(
            JSON.stringify({ error: 'Offline - API unavailable' }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' }
            }
          )
        })
    )
    return
  }

  // Handle images - cache first, then network
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          return response || fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        })
      })
    )
    return
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Offline - try cache first, then offline page
          return caches.match(request)
            .then((response) => {
              return response || caches.match('/offline.html')
            })
        })
    )
    return
  }

  // Handle all other requests - Network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(request)
          .then((response) => {
            return response || caches.match('/offline.html')
          })
      })
  )
})

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Background sync for offline actions (if needed in future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(
      // Sync any pending posts when back online
      console.log('[SW] Background sync:', event.tag)
    )
  }
})

console.log('[SW] Service Worker loaded and ready!')
