// app/dashboard/layout.tsx

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  AlertTriangle,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, dealerships(name, location)')
    .eq('id', user.id)
    .single()

  const isManager = profile?.role === 'manager' || profile?.role === 'admin'

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Groups', href: '/dashboard/groups', icon: Users, show: true },
    { name: 'Scheduled Posts', href: '/dashboard/posts', icon: Calendar, show: true },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText, show: true },
    { name: 'Territories', href: '/dashboard/territories', icon: MapPin, show: isManager },
    { name: 'Violations', href: '/dashboard/violations', icon: AlertTriangle, show: isManager },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, show: isManager },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, show: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Image
            src="/ucg-logo.png"
            alt="UCG Logo"
            width={40}
            height={40}
            style={{ width: 'auto', height: 'auto' }}
            className="object-contain"
          />
          <span className="ml-3 text-lg font-bold text-gray-900">UCG Scheduler</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (!item.show) return null
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center mb-3">
            <div className="shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.dealerships
                  ? `${profile.dealerships.name} - ${profile.dealerships.location}`
                  : 'No dealership'}
              </p>
            </div>
          </div>
          {profile?.role && (
            <div className="mb-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            </div>
          )}
          <form action="/api/auth/logout" method="POST">
            <Button 
              type="submit" 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}