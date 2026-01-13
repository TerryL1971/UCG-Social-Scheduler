// components/PWAInstallPrompt.tsx

'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedDate = dismissed ? new Date(dismissed) : null
    const daysSinceDismissed = dismissedDate 
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999

    // Show prompt if not standalone, not recently dismissed, and user has visited a few times
    const visitCount = parseInt(localStorage.getItem('visit-count') || '0') + 1
    localStorage.setItem('visit-count', visitCount.toString())

    if (!standalone && daysSinceDismissed > 7 && visitCount >= 3) {
      if (iOS) {
        setShowPrompt(true)
      }
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      
      if (daysSinceDismissed > 7 && visitCount >= 3) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  // Don't show if already installed or if dismissed
  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-2xl p-4 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Install UCG Scheduler</h3>
              <p className="text-sm text-red-100">Get quick access from your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-2 text-sm text-red-50 bg-red-800/30 rounded-lg p-3 mb-3">
            <p className="font-semibold">To install on iOS:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Tap the Share button <span className="inline-block">⎋</span></li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-white text-red-600 font-semibold py-3 px-4 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Install App
          </button>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-red-100">
          <span className="flex items-center gap-1">
            ✓ Works offline
          </span>
          <span className="flex items-center gap-1">
            ✓ Fast & secure
          </span>
          <span className="flex items-center gap-1">
            ✓ No app store
          </span>
        </div>
      </div>
    </div>
  )
}

// Add this CSS to your global styles or tailwind config
// @keyframes slide-up {
//   from {
//     transform: translateY(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateY(0);
//     opacity: 1;
//   }
// }
// .animate-slide-up {
//   animation: slide-up 0.3s ease-out;
// }