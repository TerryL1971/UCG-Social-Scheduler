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
  X
} from 'lucide-react'

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
  const [avatarType, setAvatarType] = useState<'image' | 'emoji' | 'initial'>('initial')
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Scheduled Posts', href: '/dashboard/posts', icon: Calendar, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Groups', href: '/dashboard/groups', icon: Users, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'Territories', href: '/dashboard/territories', icon: MapPin, roles: ['salesperson', 'manager', 'admin', 'owner'] },
    { name: 'My Violations', href: '/dashboard/my-violations', icon: AlertTriangle, roles: ['salesperson'] },
    { name: 'Violations', href: '/dashboard/violations', icon: AlertTriangle, roles: ['manager', 'admin', 'owner'] },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['manager', 'admin', 'owner'] },
    { name: 'Management', href: '/dashboard/management', icon: Settings, roles: ['admin', 'owner'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['salesperson', 'manager', 'admin', 'owner'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b-4 border-red-600 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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
                  quality={100}
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

            {/* User Menu */}
            {userName && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-600 capitalize">{userRole}</p>
                </div>
                <ProfileAvatarUpload
                  userId={userId}
                  currentAvatar={avatarUrl}
                  currentAvatarType={avatarType}
                  userName={userName}
                  onUpdate={checkUser}
                />
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
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
                      ? 'bg-red-600 hover:bg-red-700' 
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

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}