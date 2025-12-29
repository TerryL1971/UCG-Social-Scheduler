// app/dashboard/posts/history/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Calendar, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  content: string
  scheduled_time: string
  status: string
  platform: string
  created_at: string
  posted_at?: string
}

export default function PostHistoryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadPosts()
  })

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['posted', 'failed'])
        .order('posted_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      twitter: 'bg-sky-100 text-sky-800',
      linkedin: 'bg-indigo-100 text-indigo-800'
    }
    return colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard/posts/scheduled"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Scheduled
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Post History</h1>
          <p className="text-gray-600 mt-1">View your posted and failed posts</p>
        </div>

        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No post history yet
            </h3>
            <p className="text-gray-600 mb-6">
              Posts that have been published will appear here
            </p>
            <Link
              href="/dashboard/posts/scheduled"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Schedule a Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPlatformColor(post.platform)}`}>
                      {post.platform.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      post.status === 'posted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {post.status === 'posted' ? '✓ Posted' : '✗ Failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatDate(post.posted_at || post.scheduled_time)}
                  </div>
                </div>

                <p className="text-gray-900 whitespace-pre-wrap mb-4">
                  {post.content}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Created {formatDate(post.created_at)}
                  </span>
                  {post.status === 'posted' && (
                    <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-4 h-4" />
                      View Post
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}