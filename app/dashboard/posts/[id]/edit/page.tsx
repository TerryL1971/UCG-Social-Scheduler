// app/dashboard/posts/[id]/edit/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    redirectToSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const redirectToSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch the post to get all its parameters
      const { data: postData, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (error || !postData) {
        alert('Post not found or you do not have permission to edit it')
        router.push('/dashboard/my-violations')
        return
      }

      // Build query params to pre-fill the schedule page
      const params = new URLSearchParams({
        scheduleId: resolvedParams.id,
        groupId: postData.group_id || '',
        scheduledFor: postData.scheduled_for || '',
        postType: postData.post_type || 'brand_awareness',
      })

      // Add ai_metadata if it exists
      if (postData.ai_metadata) {
        params.append('metadata', JSON.stringify(postData.ai_metadata))
      }

      // Add notes (occasion)
      if (postData.notes) {
        params.append('notes', postData.notes)
      }

      router.push(`/dashboard/posts/schedule?${params.toString()}`)
    } catch (err) {
      console.error('Error redirecting to schedule:', err)
      alert('Failed to load post data')
      router.push('/dashboard/my-violations')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to schedule page...</p>
      </div>
    </div>
  )
}