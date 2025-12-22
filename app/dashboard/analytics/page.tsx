// app/dashboard/analytics/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users, Calendar, AlertTriangle } from 'lucide-react'

type PostWithRelations = {
  id: string
  status: string
  created_at: string
  scheduled_for: string
  generated_content: string
  profiles: {
    full_name: string | null
    email: string
    dealership_id: string | null
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

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, dealership_id, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  // Get all posts
  const { data: allPosts } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      profiles (full_name, email, dealership_id),
      facebook_groups (name, territory_id, territories(name))
    `)
    .order('created_at', { ascending: false })

  // Filter posts based on role
  let dealershipPosts: PostWithRelations[]
  
  if (profile.role === 'owner') {
    // Owners see ALL posts across all dealerships
    dealershipPosts = allPosts as PostWithRelations[] || []
  } else if (profile.role === 'manager' || profile.role === 'admin') {
    // Managers/Admins see their dealership's posts
    dealershipPosts = (allPosts as PostWithRelations[] || []).filter(post => 
      post.profiles?.dealership_id === profile.dealership_id
    )
  } else {
    // Salespeople see only their own posts
    dealershipPosts = (allPosts as PostWithRelations[] || []).filter(post => 
      post.profiles?.email === profile.email
    )
  }

  // Get stats
  const totalPosts = dealershipPosts.length
  const postedCount = dealershipPosts.filter(p => p.status === 'posted').length
  const pendingCount = dealershipPosts.filter(p => p.status === 'pending' || p.status === 'ready').length
  const completionRate = totalPosts > 0 ? Math.round((postedCount / totalPosts) * 100) : 0

  // Group by salesperson
  const postsBySalesperson: Record<string, {
    name: string
    email: string
    total: number
    posted: number
    pending: number
  }> = {}
  
  dealershipPosts.forEach(post => {
    const userName = post.profiles?.full_name || 'Unknown'
    const userEmail = post.profiles?.email || ''
    
    if (!postsBySalesperson[userName]) {
      postsBySalesperson[userName] = {
        name: userName,
        email: userEmail,
        total: 0,
        posted: 0,
        pending: 0
      }
    }
    postsBySalesperson[userName].total++
    if (post.status === 'posted') {
      postsBySalesperson[userName].posted++
    } else {
      postsBySalesperson[userName].pending++
    }
  })

  const salespeople = Object.values(postsBySalesperson)

  // Recent posts (last 20)
  const recentPosts = dealershipPosts.slice(0, 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {profile.role === 'owner' 
            ? 'Organization-wide analytics across all dealerships'
            : profile.role === 'manager' || profile.role === 'admin'
            ? 'Monitor team performance and posting activity'
            : 'Your personal posting analytics and performance'
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{postedCount}</div>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-gray-500 mt-1">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{completionRate}%</div>
            <p className="text-sm text-gray-500 mt-1">Overall</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Salesperson */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Salesperson</CardTitle>
        </CardHeader>
        <CardContent>
          {salespeople.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No posts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Total Posts</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Posted</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Pending</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {salespeople.map((person, index) => {
                    const rate = person.total > 0 ? Math.round((person.posted / person.total) * 100) : 0
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{person.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{person.email}</td>
                        <td className="py-3 px-4 text-center font-medium">{person.total}</td>
                        <td className="py-3 px-4 text-center text-green-600 font-medium">{person.posted}</td>
                        <td className="py-3 px-4 text-center text-yellow-600 font-medium">{person.pending}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            rate >= 80 ? 'bg-green-100 text-green-800' :
                            rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-start justify-between border-b pb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-gray-900">
                        {post.profiles?.full_name || 'Unknown'}
                      </p>
                      <span className="text-sm text-gray-500">→</span>
                      <p className="text-sm text-gray-600">
                        {post.facebook_groups?.name || 'Unknown Group'}
                      </p>
                      {post.facebook_groups?.territories && (
                        <>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">
                            {post.facebook_groups.territories.name}
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    post.status === 'posted' ? 'bg-green-100 text-green-800' :
                    post.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.status}
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