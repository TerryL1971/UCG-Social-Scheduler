// app/dashboard/posts/[id]/view/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft, 
  Copy, 
  CheckCircle, 
  Edit, 
  Trash2,
  Calendar,
  Users,
  MapPin,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

type Post = {
  id: string
  generated_content: string
  scheduled_for: string
  status: string
  post_type: string
  territory_violation_acknowledged: boolean
  violation_status: string | null
  notes: string | null
  facebook_groups: {
    name: string
    territory_id: string | null
    territories: {
      name: string
    } | null
  } | null
}

export default function ViewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          *,
          facebook_groups (
            name,
            territory_id,
            territories(name)
          )
        `)
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        alert('Post not found')
        router.push('/dashboard/posts')
        return
      }

      const group = Array.isArray(data.facebook_groups) 
        ? data.facebook_groups[0] 
        : data.facebook_groups

      setPost({
        ...data,
        facebook_groups: group ? {
          ...group,
          territories: Array.isArray(group.territories) 
            ? group.territories[0] 
            : group.territories
        } : null
      } as Post)
    } catch (err) {
      console.error('Error fetching post:', err)
      alert('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!post?.generated_content) return

    try {
      await navigator.clipboard.writeText(post.generated_content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleMarkAsPosted = async () => {
    if (!post) return

    setMarking(true)
    try {
      const { error } = await supabase
        .from('post_schedules')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (error) throw error

      alert('Post marked as posted! ✅')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('Error marking as posted:', err)
      alert('Failed to mark as posted')
    } finally {
      setMarking(false)
    }
  }

  const handleDelete = async () => {
    if (!post) return
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('post_schedules')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      alert('Post deleted successfully')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('Error deleting post:', err)
      alert('Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = () => {
    if (!post) return null

    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      posted: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    }

    const statusLabels: Record<string, string> = {
      pending: 'Pending Generation',
      ready: 'Ready to Post',
      posted: 'Posted',
      failed: 'Generation Failed'
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[post.status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[post.status] || post.status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Post not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/posts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Posts
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">View Post</h1>
          <p className="text-gray-600 mt-1">Review and copy your post content</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Post Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Post Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Facebook Group</p>
                <p className="font-medium text-gray-900">
                  {post.facebook_groups?.name || 'Unknown Group'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Territory</p>
                <p className="font-medium text-gray-900">
                  {post.facebook_groups?.territories?.name || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Scheduled For</p>
                <p className="font-medium text-gray-900">
                  {new Date(post.scheduled_for).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-5 h-5 text-orange-600 flex items-center justify-center">
                📝
              </div>
              <div>
                <p className="text-sm text-gray-500">Post Type</p>
                <p className="font-medium text-gray-900 capitalize">
                  {post.post_type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {post.notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Notes:</strong> {post.notes}
              </p>
            </div>
          )}

          {post.territory_violation_acknowledged && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-orange-600 mr-2 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-900">Territory Violation</p>
                <p className="text-sm text-orange-800 mt-1">
                  This post is outside your assigned territory. 
                  {post.violation_status === 'justified' && ' Justification provided.'}
                  {post.violation_status === 'authorization_requested' && ' Authorization requested.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Post Content</CardTitle>
            <Button
              onClick={handleCopy}
              disabled={!post.generated_content}
              variant="secondary"
              size="sm"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {post.generated_content ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {post.generated_content}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                ⏳ Content not yet generated. It will be automatically generated 2 hours before the scheduled time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-wrap gap-3">
            {post.status === 'ready' && (
              <Button
                onClick={handleMarkAsPosted}
                disabled={marking}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {marking ? 'Marking...' : 'Mark as Posted'}
              </Button>
            )}

            <Link href={`/dashboard/posts/${post.id}/edit`}>
              <Button variant="secondary">
                <Edit className="w-4 h-4 mr-2" />
                Edit Post
              </Button>
            </Link>

            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Post'}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Copy the content above and paste it directly into your Facebook group. 
              After posting, click &quot;Mark as Posted&quot; to update the status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}