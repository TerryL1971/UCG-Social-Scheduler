// app/dashboard/posts/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Plus, CheckCircle, Clock, Copy, Check } from 'lucide-react'

type ScheduledPost = {
  id: string
  generated_content: string
  scheduled_for: string
  status: string
  facebook_groups: { name: string } | null
}

export default function PostsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPosts = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
      return
    }

    const { data } = await supabase
      .from('scheduled_posts')
      .select('*, facebook_groups(name)')
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true })

    setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markAsPosted = async (postId: string) => {
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ 
        status: 'posted',
        posted_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (error) {
      alert('Failed to update post status')
    } else {
      // Also add to post_history
      const post = posts.find(p => p.id === postId)
      if (post) {
        const { data: { user } } = await supabase.auth.getUser()
        const groupData = post.facebook_groups as { name: string } | null
        
        await supabase.from('post_history').insert({
          scheduled_post_id: postId,
          user_id: user?.id,
          group_id: groupData ? postId : null,
          content: post.generated_content,
          posted_at: new Date().toISOString()
        })
      }
      fetchPosts()
    }
  }

  const copyToClipboard = async (content: string, postId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(postId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading...</div>
  }

  const pendingPosts = posts.filter(p => p.status === 'pending' || p.status === 'ready')
  const completedPosts = posts.filter(p => p.status === 'posted')

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

      {/* Pending Posts */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-yellow-600" />
          Upcoming Posts ({pendingPosts.length})
        </h2>
        {pendingPosts.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {post.facebook_groups?.name || 'Unknown Group'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        📅 {new Date(post.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      post.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.status === 'ready' ? '🔔 Ready' : '⏰ Pending'}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {post.generated_content}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(post.generated_content, post.id)}
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => markAsPosted(post.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Posted
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Posts */}
      {completedPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Completed Posts ({completedPosts.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {completedPosts.map((post) => (
              <Card key={post.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {post.facebook_groups?.name || 'Unknown Group'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        ✅ Posted on {new Date(post.scheduled_for).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      ✅ Posted
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}