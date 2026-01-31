// app/pwa-register.tsx

'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope)

            // Check for updates every hour
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000)

            // Handle service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker installed, show update notification
                    console.log('🔄 New version available! Refresh to update.')
                    
                    // Optional: Show a toast notification to user
                    if (confirm('New version available! Reload to update?')) {
                      window.location.reload()
                    }
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error)
          })
      })

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('📦 Cache updated:', event.data.url)
        }
      })

      // Handle offline/online status
      window.addEventListener('online', () => {
        console.log('🌐 Back online!')
      })

      window.addEventListener('offline', () => {
        console.log('📴 You are offline. App will work with cached data.')
      })
    }

    // iOS-specific: Handle beforeinstallprompt
    let deferredPrompt: any = null
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('💾 Install prompt ready')
    })

    // iOS-specific: Prevent default touch handling for better PWA feel
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Prevent double-tap zoom on iOS
      let lastTouchEnd = 0
      document.addEventListener('touchend', (event) => {
        const now = Date.now()
        if (now - lastTouchEnd <= 300) {
          event.preventDefault()
        }
        lastTouchEnd = now
      }, false)

      // Prevent iOS rubber-band scrolling at top of page
      document.addEventListener('touchmove', (event) => {
        if (window.scrollY === 0) {
          const target = event.target as HTMLElement
          if (!target.closest('.overflow-y-auto, .overflow-auto')) {
            // Only prevent if not in a scrollable element
            // This allows modals and scrollable content to work
          }
        }
      }, { passive: false })
    }

    // Log PWA status
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ Running as installed PWA')
    } else {
      console.log('🌐 Running in browser')
    }

  }, [])

  return null
}
