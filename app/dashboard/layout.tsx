// app/dashboard/layout.tsx

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileAvatarUpload from '@/components/ProfileAvatarUpload'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  MapPin, 
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  RotateCw,
  Sparkles,
  Layers,
} from 'lucide-react'
import PWARegister from '../pwa-register'

// PWA Install Button Component - iOS Compatible
function PWAInstallButton() {
  const [mounted, setMounted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)
    
    // Check if already installed (works for both iOS and Android/Desktop)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
  }, [])

  // Don't render during SSR
  if (!mounted) return null

  // Already installed - show success badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="hidden sm:inline">Installed</span>
      </div>
    )
  }

  // iOS - Show install button with instructions modal
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSInstructions(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>

        {/* iOS Installation Instructions Modal */}
        {showIOSInstructions && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <div 
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Install UCG Scheduler</h3>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700">
                <p className="text-gray-600">
                  Install this app on your iPhone for quick access and offline use!
                </p>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Tap the Share button</p>
                    <p className="text-gray-600">Look for the square with an arrow pointing up at the bottom of Safari</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Select "Add to Home Screen"</p>
                    <p className="text-gray-600">Scroll down in the menu and tap this option</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Tap "Add"</p>
                    <p className="text-gray-600">Confirm by tapping "Add" in the top right corner</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Once installed, the app will work offline and appear on your home screen like a native app!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-6 w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Not iOS and not installed - don't show anything
  // (Android/Desktop will get automatic install prompt)
  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [avatarType, setAvatarType] = useState<'image' | 'generated' | 'initial'>('initial')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url, avatar_type')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRole(profile.role)
      setUserName(profile.full_name || user.email || 'User')
      setAvatarUrl(profile.avatar_url || '')
      setAvatarType(profile.avatar_type || 'initial')
    }
  }

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAvatarUpdate = async () => {
    await checkUser()
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Create Post', href: '/dashboard/posts/create', icon: Sparkles, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Scheduled Posts', href: '/dashboard/posts', icon: Calendar, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Bulk Operations', href: '/dashboard/posts/bulk', icon: Layers, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Recurring Posts', href: '/dashboard/posts/recurring', icon: RotateCw, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Groups', href: '/dashboard/groups', icon: Users, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Territories', href: '/dashboard/territories', icon: MapPin, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['manager', 'admin', 'owner'] },
    { name: 'My Violations', href: '/dashboard/my-violations', icon: AlertTriangle, roles: ['salesperson'] },
    { name: 'Violations', href: '/dashboard/violations', icon: AlertTriangle, roles: ['manager', 'admin', 'owner'] },
    { name: 'Management', href: '/dashboard/management', icon: Settings, roles: ['admin', 'owner'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['salesperson', 'manager', 'admin', 'owner'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  console.log('🔍 Debug - User Role:', userRole)
  console.log('🔍 Debug - All Nav Items:', navigation.length)
  console.log('🔍 Debug - Filtered Nav:', filteredNavigation.map(n => n.name))

  return (
    <>
      <PWARegister />
      
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b-4 border-red-600 shadow-sm sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-4">
              {/* Left: Logo */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                
                <Link href="/dashboard" className="flex items-center gap-3">
                  <Image 
                    src="/ucg-logo.png" 
                    alt="Used Car Guys" 
                    width={120}
                    height={40}      
                    className="h-10 w-auto"
                    priority
                    unoptimized
                  />
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-bold text-gray-900">
                      Social Scheduler
                    </h1>
                    <p className="text-xs text-gray-600">
                      Used Car Guys Marketing
                    </p>
                  </div>
                </Link>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* PWA Button - Always Visible */}
              <PWAInstallButton />

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right: User Menu - Only shows when userName loaded */}
              <div className="flex items-center gap-3">
                {userName && (
                  <>
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-gray-900">{userName}</p>
                      <p className="text-xs text-gray-600 capitalize">{userRole}</p>
                    </div>
                    <ProfileAvatarUpload
                      userId={userId}
                      currentAvatar={avatarUrl}
                      currentAvatarType={avatarType}
                      userName={userName}
                      onUpdate={handleAvatarUpdate}
                    />
                    <button
                      onClick={handleLogout}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5 text-gray-600" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 
            transform transition-transform duration-300 ease-in-out lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            h-screen lg:h-auto
          `}>
            <nav className="h-full overflow-y-auto p-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-700'}`} />
                    <span className={`${isActive ? 'text-white' : 'text-gray-700'}`}>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}