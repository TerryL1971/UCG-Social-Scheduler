// components/PWAInstallButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { Download, Check } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsInstalled(standalone)

    if (standalone) {
      return // Don't show button if already installed
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // For iOS Safari - always show button
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && !standalone) {
      setShowButton(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS fallback - show instructions
      alert('To install:\n1. Tap the Share button\n2. Scroll down\n3. Tap "Add to Home Screen"')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setShowButton(false)
    }

    setDeferredPrompt(null)
  }

  // Don't show if installed or not available
  if (isInstalled || !showButton) {
    return null
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
      title="Install App"
    >
      <Download className="w-5 h-5" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  )
}