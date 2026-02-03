// app/dashboard/page.tsx - MOBILE OPTIMIZED

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { DashboardSkeleton } from '@/components/ui/LoadingSkeletons'
import Link from 'next/link'
import { Calendar, MapPin, TrendingUp, Users, Plus, Clock } from 'lucide-react'

type Stats = {
  scheduledPosts: number
  activeGroups: number
  territories: number
  postedToday: number
}

type UpcomingPost = {
  id: string
  generated_content: string
  scheduled_for: string
  status: string
  facebook_groups: { name: string } | null
  territories?: { name: string } | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    scheduledPosts: 0,
    activeGroups: 0,
    territories: 0,
    postedToday: 0
  })
  const [upcomingPosts, setUpcomingPosts] = useState<UpcomingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        redirect('/login')
        return
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setUserName(profile?.full_name || user.email || '')

      // Fetch scheduled posts count
      const { count: scheduledCount } = await supabase
        .from('post_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'ready'])

      // Fetch active groups count
      const { count: groupsCount } = await supabase
        .from('facebook_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Fetch territories count
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let territoriesCount = 0
      if (profileData?.role === 'salesperson') {
        const { count } = await supabase
          .from('profile_territories')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', user.id)
        territoriesCount = count || 0
      } else {
        const { count } = await supabase
          .from('territories')
          .select('*', { count: 'exact', head: true })
        territoriesCount = count || 0
      }

      // Fetch posts posted today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: postedTodayCount } = await supabase
        .from('post_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .gte('posted_at', today.toISOString())

      setStats({
        scheduledPosts: scheduledCount || 0,
        activeGroups: groupsCount || 0,
        territories: territoriesCount,
        postedToday: postedTodayCount || 0
      })

      // Fetch upcoming posts
      const { data: posts } = await supabase
        .from('post_schedules')
        .select('*, facebook_groups(name), territories:facebook_groups(territories(name))')
        .eq('user_id', user.id)
        .in('status', ['pending', 'ready'])
        .order('scheduled_for', { ascending: true })
        .limit(3)

      setUpcomingPosts(posts || [])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="ucg-badge-success">Ready</span>
      case 'pending':
        return <span className="ucg-badge-warning">Pending</span>
      case 'posted':
        return <span className="ucg-badge-info">Posted</span>
      default:
        return <span className="ucg-badge-info">{status}</span>
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header - Mobile Optimized */}
      <div className="p-4 sm:p-6 rounded-lg shadow-lg" style={{ background: 'linear-gradient(to right, #23326d, #1c295d)' }}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Welcome back, {userName}! 👋
        </h1>
        <p className="mt-2 text-sm sm:text-base text-white">
          Here&apos;s what&apos;s happening with your social media schedule
        </p>
      </div>

      {/* Stats Cards - Mobile: Stack, Tablet+: Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ucg-card p-4 sm:p-6 animate-slide-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">
                Scheduled
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {stats.scheduledPosts}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link href="/dashboard/posts">
              <span className="text-xs sm:text-sm text-red-600 font-medium hover:underline cursor-pointer">
                View all →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-4 sm:p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">
                Groups
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {stats.activeGroups}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link href="/dashboard/groups">
              <span className="text-xs sm:text-sm text-red-600 font-medium hover:underline cursor-pointer">
                Manage →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-4 sm:p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">
                Territories
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {stats.territories}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link href="/dashboard/territories">
              <span className="text-xs sm:text-sm text-red-600 font-medium hover:underline cursor-pointer">
                View →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-4 sm:p-6 animate-slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">
                Today
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {stats.postedToday}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className={`text-xs sm:text-sm ${stats.postedToday > 0 ? "ucg-badge-success" : "ucg-badge-warning"}`}>
              {stats.postedToday > 0 ? 'On Track' : 'No Posts'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="ucg-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/posts/create" className="block">
            <button className="ucg-btn-primary w-full justify-center min-h-[44px] text-sm sm:text-base">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Schedule New Post</span>
              <span className="sm:hidden">New Post</span>
            </button>
          </Link>
          <Link href="/dashboard/groups" className="block">
            <button className="w-full px-4 sm:px-6 py-2.5 min-h-[44px] rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200 text-sm sm:text-base">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
              <span className="hidden sm:inline">Manage Groups</span>
              <span className="sm:hidden">Groups</span>
            </button>
          </Link>
          <Link href="/dashboard/templates" className="block">
            <button className="w-full px-4 sm:px-6 py-2.5 min-h-[44px] rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200 text-sm sm:text-base">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
              <span className="hidden sm:inline">View Templates</span>
              <span className="sm:hidden">Templates</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Upcoming Posts - Mobile Optimized */}
      <div className="ucg-section-header">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Upcoming Scheduled Posts
        </h2>
      </div>

      {upcomingPosts.length === 0 ? (
        <div className="ucg-card p-8 sm:p-12 text-center">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No upcoming posts</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Schedule your first post to get started</p>
          <Link href="/dashboard/posts/create">
            <button className="ucg-btn-primary min-h-[44px]">
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {upcomingPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="ucg-card p-4 sm:p-6 animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    {getStatusBadge(post.status)}
                    <span className="text-xs sm:text-sm text-gray-600 truncate">
                      📅 {new Date(post.scheduled_for).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-900 mb-3 line-clamp-2">
                    {post.generated_content}
                  </p>

                  {post.facebook_groups && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="truncate">{post.facebook_groups.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 sm:ml-4">
                  <Link href={`/dashboard/posts`} className="flex-1 sm:flex-none">
                    <button className="w-full px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <div className="text-center">
            <Link href="/dashboard/posts">
              <button className="px-6 py-3 min-h-[44px] rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200 cursor-pointer text-sm sm:text-base">
                View All Posts
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}