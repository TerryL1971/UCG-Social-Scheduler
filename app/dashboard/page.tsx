// app/dashboard/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
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
        .from('scheduled_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'ready'])

      // Fetch active groups count
      const { count: groupsCount } = await supabase
        .from('facebook_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Fetch territories count (from profile_territories or all territories for managers)
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
        .from('scheduled_posts')
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
        .from('scheduled_posts')
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="p-6 rounded-lg shadow-lg" style={{ background: 'linear-gradient(to right, #dc2626, #b91c1c)' }}>
        <h1 className="text-3xl font-bold text-white">Welcome back, {userName}! 👋</h1>
        <p className="mt-2 text-white">Here&apos;s what&apos;s happening with your social media schedule</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="ucg-card p-6 animate-slide-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Scheduled Posts
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.scheduledPosts}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/posts">
              <span className="text-sm text-red-600 font-medium hover:underline cursor-pointer">
                View all posts →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Active Groups
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.activeGroups}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/groups">
              <span className="text-sm text-red-600 font-medium hover:underline cursor-pointer">
                Manage groups →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Territories
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.territories}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/territories">
              <span className="text-sm text-red-600 font-medium hover:underline cursor-pointer">
                View territories →
              </span>
            </Link>
          </div>
        </div>

        <div className="ucg-card p-6 animate-slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Posted Today
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.postedToday}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className={stats.postedToday > 0 ? "ucg-badge-success" : "ucg-badge-warning"}>
              {stats.postedToday > 0 ? 'On Track' : 'No Posts Yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ucg-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/posts/create">
            <button className="ucg-btn-primary w-full justify-center">
              <Plus className="w-5 h-5" />
              Schedule New Post
            </button>
          </Link>
          <Link href="/dashboard/groups">
            <button className="w-full px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200">
              <Users className="w-5 h-5 inline mr-2" />
              Manage Groups
            </button>
          </Link>
          <Link href="/dashboard/templates">
            <button className="w-full px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200">
              <Calendar className="w-5 h-5 inline mr-2" />
              View Templates
            </button>
          </Link>
        </div>
      </div>

      {/* Upcoming Posts */}
      <div className="ucg-section-header">
        <h2 className="text-xl font-bold text-gray-900">
          Upcoming Scheduled Posts
        </h2>
      </div>

      {upcomingPosts.length === 0 ? (
        <div className="ucg-card p-12 text-center">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming posts</h3>
          <p className="text-gray-600 mb-4">Schedule your first post to get started</p>
          <Link href="/dashboard/posts/create">
            <button className="ucg-btn-primary">
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="ucg-card p-6 animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusBadge(post.status)}
                    <span className="text-sm text-gray-600">
                      📅 {new Date(post.scheduled_for).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-gray-900 mb-3 line-clamp-2">
                    {post.generated_content}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    {post.facebook_groups && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{post.facebook_groups.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Link href={`/dashboard/posts`}>
                    <button className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <div className="text-center">
            <Link href="/dashboard/posts">
              <button className="px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200 cursor-pointer">
                View All Posts
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}