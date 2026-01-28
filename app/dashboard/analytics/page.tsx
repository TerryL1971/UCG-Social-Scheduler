// app/dashboard/analytics/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react'

type PostWithRelations = {
  id: string
  status: string
  created_at: string
  scheduled_for: string
  post_type: string
  reminder_sent: boolean
  generated_content: string | null
  profiles: {
    full_name: string | null
    email: string
  } | null
  facebook_groups: {
    name: string
    territory_id: string | null
    territories: {
      name: string
    } | null
  } | null
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  // Get all posts for this user
  const { data: allPosts } = await supabase
    .from('post_schedules')
    .select(`
      *,
      facebook_groups (name, territory_id, territories(name))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const posts = (allPosts as PostWithRelations[]) || []

  // Calculate stats
  const now = new Date()
  const totalPosts = posts.length
  const postedCount = posts.filter(p => p.status === 'posted').length
  const scheduledCount = posts.filter(p => p.status === 'scheduled' && new Date(p.scheduled_for) > now).length
  const contentReadyCount = posts.filter(p => p.status === 'content_ready').length
  const cancelledCount = posts.filter(p => p.status === 'cancelled').length
  const completionRate = totalPosts > 0 ? Math.round((postedCount / totalPosts) * 100) : 0

  // Posts by type
  const postsByType: Record<string, number> = {}
  posts.forEach(post => {
    postsByType[post.post_type] = (postsByType[post.post_type] || 0) + 1
  })

  // Posts by group
  const postsByGroup: Record<string, number> = {}
  posts.forEach(post => {
    const groupName = post.facebook_groups?.name || 'Unknown'
    postsByGroup[groupName] = (postsByGroup[groupName] || 0) + 1
  })

  // Posts by month (last 6 months)
  const postsByMonth: Record<string, { scheduled: number, posted: number }> = {}
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }).reverse()

  last6Months.forEach(month => {
    postsByMonth[month] = { scheduled: 0, posted: 0 }
  })

  posts.forEach(post => {
    const postDate = new Date(post.scheduled_for)
    const monthKey = postDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (postsByMonth[monthKey]) {
      postsByMonth[monthKey].scheduled++
      if (post.status === 'posted') {
        postsByMonth[monthKey].posted++
      }
    }
  })

  // Recent posts (last 20)
  const recentPosts = posts.slice(0, 20)

  // Upcoming posts (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingPosts = posts.filter(p => 
    new Date(p.scheduled_for) > now && 
    new Date(p.scheduled_for) <= sevenDaysFromNow &&
    (p.status === 'scheduled' || p.status === 'content_ready')
  ).sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Track your posting performance and activity
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Posts
            </CardTitle>
            <Calendar className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalPosts}</div>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Posted
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{postedCount}</div>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Scheduled
            </CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{scheduledCount}</div>
            <p className="text-sm text-gray-500 mt-1">Upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Content Ready
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{contentReadyCount}</div>
            <p className="text-sm text-gray-500 mt-1">Action needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{completionRate}%</div>
            <p className="text-sm text-gray-500 mt-1">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(postsByType).length === 0 ? (
                <div className="text-center py-8 text-gray-500">No data</div>
              ) : (
                Object.entries(postsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const percentage = Math.round((count / totalPosts) * 100)
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posts by Group */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Facebook Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(postsByGroup).length === 0 ? (
                <div className="text-center py-8 text-gray-500">No data</div>
              ) : (
                Object.entries(postsByGroup)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([group, count]) => {
                    const percentage = Math.round((count / totalPosts) * 100)
                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{group}</span>
                          <span className="text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posting Trends (Last 6 Months) */}
      <Card>
        <CardHeader>
          <CardTitle>Posting Trends - Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {last6Months.map(month => {
              const data = postsByMonth[month]
              const maxValue = Math.max(...Object.values(postsByMonth).map(d => Math.max(d.scheduled, d.posted)))
              return (
                <div key={month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium w-24">{month}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-blue-600">Scheduled: {data.scheduled}</span>
                      <span className="text-green-600">Posted: {data.posted}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${maxValue > 0 ? (data.scheduled / maxValue) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${maxValue > 0 ? (data.posted / maxValue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts (Next 7 Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Posts (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No posts scheduled in the next 7 days
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => {
                const scheduledDate = new Date(post.scheduled_for)
                const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={post.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">
                          {post.facebook_groups?.name || 'Unknown Group'}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          post.status === 'content_ready' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {post.status === 'content_ready' ? 'Ready to Post' : 'Scheduled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">
                          {scheduledDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <span className="text-sm text-gray-400">•</span>
                        <p className="text-sm text-gray-500 capitalize">
                          {post.post_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent posts
            </div>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-start justify-between border-b pb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">
                        {post.facebook_groups?.name || 'Unknown Group'}
                      </p>
                      {post.facebook_groups?.territories && (
                        <>
                          <span className="text-sm text-gray-400">•</span>
                          <p className="text-sm text-gray-500">
                            {post.facebook_groups.territories.name}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {new Date(post.scheduled_for).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className="text-sm text-gray-400">•</span>
                      <p className="text-sm text-gray-500 capitalize">
                        {post.post_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                    post.status === 'posted' ? 'bg-green-100 text-green-800' :
                    post.status === 'content_ready' ? 'bg-blue-100 text-blue-800' :
                    post.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {post.status === 'content_ready' ? 'Ready' : 
                     post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}