// app/dashboard/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  FileText,
  TrendingUp,
  MapPin,
  BarChart3
} from 'lucide-react'

type DashboardStats = {
  totalPosts: number
  pendingPosts: number
  completedPosts: number
  overduePosts: number
  postsThisWeek: number
  postsThisMonth: number
  totalGroups: number
  groupsWithPosts: number
  groupsNeedingPosts: number
  totalTemplates: number
  violationsThisMonth: number
  complianceRate: number
}

type GroupCoverage = {
  id: string
  name: string
  hasScheduledPost: boolean
  lastPostDate: string | null
  territory_name: string | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    pendingPosts: 0,
    completedPosts: 0,
    overduePosts: 0,
    postsThisWeek: 0,
    postsThisMonth: 0,
    totalGroups: 0,
    groupsWithPosts: 0,
    groupsNeedingPosts: 0,
    totalTemplates: 0,
    violationsThisMonth: 0,
    complianceRate: 100
  })
  const [groupCoverage, setGroupCoverage] = useState<GroupCoverage[]>([])
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is manager
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userIsManager = profile?.role === 'manager' || profile?.role === 'admin'
      setIsManager(userIsManager)

      // Fetch all posts
      const { data: posts } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)

      // Fetch groups with post info
      const { data: groups } = await supabase
        .from('facebook_groups')
        .select(`
          id, 
          name, 
          territory_id,
          territories(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Fetch templates
      const { data: templates } = await supabase
        .from('templates')
        .select('id')
        .eq('user_id', user.id)

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Calculate stats
      const pending = posts?.filter(p => p.status === 'pending' || p.status === 'ready') || []
      const completed = posts?.filter(p => p.status === 'posted') || []
      const overdue = posts?.filter(p => 
        new Date(p.scheduled_for) < now && p.status !== 'posted'
      ) || []
      const thisWeek = posts?.filter(p => new Date(p.created_at) >= weekAgo) || []
      const thisMonth = posts?.filter(p => new Date(p.created_at) >= monthStart) || []
      const violations = posts?.filter(p => 
        p.territory_violation_acknowledged && new Date(p.created_at) >= monthStart
      ) || []

      // Group coverage
      const groupsWithScheduled = new Set(
        pending.map(p => p.group_id).filter(Boolean)
      )

      const coverage: GroupCoverage[] = (groups || []).map(g => {
        const territory = Array.isArray(g.territories) ? g.territories[0] : g.territories
        return {
          id: g.id,
          name: g.name,
          hasScheduledPost: groupsWithScheduled.has(g.id),
          lastPostDate: null, // Could be enhanced with actual last post date
          territory_name: territory?.name || null
        }
      })

      const totalPosts = posts?.length || 0
      const violationCount = violations.length
      const compliance = totalPosts > 0 ? Math.round(((totalPosts - violationCount) / totalPosts) * 100) : 100

      setStats({
        totalPosts,
        pendingPosts: pending.length,
        completedPosts: completed.length,
        overduePosts: overdue.length,
        postsThisWeek: thisWeek.length,
        postsThisMonth: thisMonth.length,
        totalGroups: groups?.length || 0,
        groupsWithPosts: groupsWithScheduled.size,
        groupsNeedingPosts: (groups?.length || 0) - groupsWithScheduled.size,
        totalTemplates: templates?.length || 0,
        violationsThisMonth: violationCount,
        complianceRate: compliance
      })

      setGroupCoverage(coverage)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your social media activity</p>
        </div>
        <Link href="/dashboard/posts/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Posts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Posts</p>
                <p className="text-3xl font-bold text-blue-600">{stats.pendingPosts}</p>
                <p className="text-xs text-gray-500 mt-1">Ready to post</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Posts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedPosts}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully posted</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Posts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats.overduePosts}</p>
                <p className="text-xs text-gray-500 mt-1">Need attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalTemplates}</p>
                <p className="text-xs text-gray-500 mt-1">Saved templates</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.postsThisWeek}</p>
            <p className="text-sm text-gray-600">Posts created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Calendar className="w-5 h-5 mr-2 text-green-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.postsThisMonth}</p>
            <p className="text-sm text-gray-600">Posts created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalPosts}</p>
            <p className="text-sm text-gray-600">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Territory Compliance (Managers Only) */}
      {isManager && (
        <Card className={stats.violationsThisMonth > 0 ? 'border-orange-300' : 'border-green-300'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                Territory Compliance
              </span>
              <Link href="/dashboard/violations">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.complianceRate}%</p>
                <p className="text-sm text-gray-600">Compliance Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">{stats.violationsThisMonth}</p>
                <p className="text-sm text-gray-600">Violations This Month</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.postsThisMonth - stats.violationsThisMonth}</p>
                <p className="text-sm text-gray-600">Compliant Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Group Coverage ({stats.groupsWithPosts}/{stats.totalGroups})
            </span>
            <Link href="/dashboard/groups">
              <Button variant="outline" size="sm">
                Manage Groups
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.groupsNeedingPosts > 0 ? (
            <>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  <strong>{stats.groupsNeedingPosts}</strong> group{stats.groupsNeedingPosts !== 1 ? 's' : ''} {stats.groupsNeedingPosts !== 1 ? 'don\'t' : 'doesn\'t'} have any scheduled posts
                </p>
              </div>
              <div className="space-y-2">
                {groupCoverage.filter(g => !g.hasScheduledPost).map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {group.territory_name && (
                        <p className="text-xs text-gray-600 mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {group.territory_name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-orange-600 font-medium">
                      No posts scheduled
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">All Groups Covered! 🎉</h3>
              <p className="text-sm text-gray-600">
                Every group has at least one scheduled post
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/dashboard/posts/create">
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </Link>
            <Link href="/dashboard/posts">
              <Button className="w-full" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                View Posts
              </Button>
            </Link>
            <Link href="/dashboard/groups">
              <Button className="w-full" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </Link>
            <Link href="/dashboard/templates">
              <Button className="w-full" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}