// public/sw.js
const CACHE_NAME = 'ucg-scheduler-v1'
const RUNTIME_CACHE = 'ucg-runtime'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/dashboard',
  '/dashboard/posts',
  '/dashboard/posts/schedule',
  '/offline.html'
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // API requests - network first, cache fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET requests
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(event.request)
        })
    )
    return
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(event.request)
          .then((response) => {
            // Cache successful GET requests
            if (event.request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
          })
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'UCG Social Scheduler'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: data.tag || 'notification',
    data: {
      url: data.url || '/dashboard',
      scheduleId: data.scheduleId
    },
    actions: [
      {
        action: 'view',
        title: 'View Post'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: true
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    const url = event.notification.data.url || '/dashboard'
    event.waitUntil(
      clients.openWindow(url)
    )
  }
})

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts())
  }
})

async function syncPosts() {
  // Sync any pending actions when back online
  const cache = await caches.open(RUNTIME_CACHE)
  const requests = await cache.keys()
  
  for (const request of requests) {
    if (request.url.includes('/api/posts')) {
      try {
        await fetch(request)
      } catch (error) {
        console.error('Sync failed:', error)
      }
    }
  }
}