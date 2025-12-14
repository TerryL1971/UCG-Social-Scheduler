// app/dashboard/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
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
    .select('*, dealerships(name, location)')
    .eq('id', user.id)
    .single()

  // Get stats
  const { count: groupsCount } = await supabase
    .from('facebook_groups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { count: scheduledCount } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending', 'ready'])

  // Calculate date for posts this week (7 days ago)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: postedThisWeek } = await supabase
    .from('post_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('posted_at', sevenDaysAgo.toISOString())

  // Get upcoming posts
  const { data: upcomingPosts } = await supabase
    .from('scheduled_posts')
    .select('*, facebook_groups(name)')
    .eq('user_id', user.id)
    .in('status', ['pending', 'ready'])
    .order('scheduled_for', { ascending: true })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {profile?.dealerships?.name
            ? `${profile.dealerships.name}${
                profile.dealerships.location
                  ? ` - ${profile.dealerships.location}`
                  : ''
              } • `
            : ''}
          Here&apos;s what&apos;s happening with your posts
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Scheduled Posts
            </CardTitle>
            <Clock className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{scheduledCount || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Ready to post</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Groups
            </CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{groupsCount || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Facebook groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Posts This Week
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{postedThisWeek || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
            <Calendar className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">0%</div>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Posts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Posts</CardTitle>
                <CardDescription>Your next scheduled posts</CardDescription>
              </div>
              <Link href="/dashboard/posts">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingPosts && upcomingPosts.length > 0 ? (
              <div className="space-y-4">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {post.facebook_groups?.name || 'Unknown Group'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {post.generated_content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(post.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        post.status === 'ready'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No scheduled posts yet</p>
                <Link href="/dashboard/posts/create">
                  <Button>Schedule Your First Post</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started quickly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/posts/create" className="block">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Create New Post
              </Button>
            </Link>
            <Link href="/dashboard/groups" className="block">
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </Link>
            <Link href="/dashboard/templates" className="block">
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="w-4 h-4 mr-2" />
                View Templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide (only show if no groups) */}
      {groupsCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Set up your social media scheduler in a few simple steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Add Facebook Groups</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Import the groups you want to post to
                </p>
                <Link href="/dashboard/groups">
                  <Button size="sm">Add Groups</Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="shrink-0 w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Create Post Templates</h3>
                <p className="text-sm text-gray-600">
                  Build reusable ad templates with AI assistance
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="shrink-0 w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Schedule Your Posts</h3>
                <p className="text-sm text-gray-600">
                  Set up automated reminders to post at the right time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}