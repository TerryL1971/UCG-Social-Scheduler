import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Plus } from 'lucide-react'

export default async function PostsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*, facebook_groups(name)')
    .eq('user_id', user.id)
    .order('scheduled_for', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="text-gray-600 mt-1">Manage your upcoming social media posts</p>
        </div>
        <Link href="/dashboard/posts/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </Link>
      </div>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {post.facebook_groups?.name || 'Unknown Group'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {post.generated_content}
                    </p>
                    <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                      <span>📅 {new Date(post.scheduled_for).toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded ${
                        post.status === 'ready' ? 'bg-green-100 text-green-800' :
                        post.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled posts</h3>
            <p className="text-gray-600 mb-4">Create your first post to get started</p>
            <Link href="/dashboard/posts/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}