// app/dashboard/posts/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Plus, CheckCircle, Clock, Copy, Check, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
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

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', postId)

    if (error) {
      alert('Failed to delete post')
    } else {
      fetchPosts()
    }
  }

  const startEdit = (postId: string, content: string) => {
    setEditingId(postId)
    setEditContent(content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const saveEdit = async (postId: string) => {
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ generated_content: editContent })
      .eq('id', postId)

    if (error) {
      alert('Failed to save changes')
    } else {
      setEditingId(null)
      setEditContent('')
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

  const getPostStatus = (post: ScheduledPost) => {
    const scheduledDate = new Date(post.scheduled_for)
    const now = new Date()
    
    if (post.status === 'posted') {
      return { label: '✅ Posted', color: 'bg-green-100 text-green-800', isOverdue: false }
    }
    
    if (scheduledDate < now) {
      return { label: '⚠️ Overdue', color: 'bg-red-100 text-red-800', isOverdue: true }
    }
    
    if (post.status === 'ready') {
      return { label: '🔔 Ready', color: 'bg-blue-100 text-blue-800', isOverdue: false }
    }
    
    return { label: '⏰ Pending', color: 'bg-yellow-100 text-yellow-800', isOverdue: false }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading...</div>
  }

  const pendingPosts = posts.filter(p => p.status === 'pending' || p.status === 'ready' || getPostStatus(p).isOverdue)
  const completedPosts = posts.filter(p => p.status === 'posted')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="text-gray-600 mt-1">Manage your upcoming social media posts</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/posts/history">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Post History
            </Button>
          </Link>
          <Link href="/dashboard/posts/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending/Overdue Posts */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-yellow-600" />
          Upcoming & Overdue Posts ({pendingPosts.length})
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
            {pendingPosts.map((post) => {
              const status = getPostStatus(post)
              const isEditing = editingId === post.id
              
              return (
                <Card key={post.id} className={status.isOverdue ? 'border-red-300' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {post.facebook_groups?.name || 'Unknown Group'}
                          </h3>
                          {status.isOverdue && <AlertTriangle className="w-5 h-5 text-red-600" />}
                        </div>
                        <p className="text-sm text-gray-500">
                          📅 {new Date(post.scheduled_for).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-48"
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => saveEdit(post.id)}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {post.generated_content}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
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
                            variant="outline"
                            onClick={() => startEdit(post.id, post.generated_content)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>

                          <Button 
                            size="sm"
                            onClick={() => markAsPosted(post.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Posted
                          </Button>

                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => deletePost(post.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
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
            {completedPosts.slice(0, 5).map((post) => (
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
          {completedPosts.length > 5 && (
            <div className="text-center mt-4">
              <Link href="/dashboard/posts/history">
                <Button variant="outline">View All Completed Posts</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}