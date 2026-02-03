// app/dashboard/posts/page.tsx - MOBILE OPTIMIZED

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PostsListSkeleton } from '@/components/ui/LoadingSkeletons'
import { Calendar, Clock, Users, Eye, RotateCw, CheckCircle, XCircle, Trash2, Plus, Mail } from 'lucide-react'
import { toast } from 'sonner'

type PostSchedule = {
  id: string
  scheduled_for: string
  post_type: string
  status: 'scheduled' | 'content_ready' | 'posted' | 'cancelled'
  reminder_sent: boolean
  generated_content?: string
  content_generated_at?: string
  target_audience?: string
  special_context?: string
  facebook_groups: {
    name: string
    group_url?: string
  }
  territories: {
    name: string
  }
}

export default function PostsDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<PostSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<PostSchedule | null>(null)
  const [showContentModal, setShowContentModal] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          id,
          scheduled_for,
          post_type,
          status,
          reminder_sent,
          generated_content,
          content_generated_at,
          target_audience,
          special_context,
          facebook_groups!inner(name, group_url),
          territories(name)
        `)
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'content_ready', 'posted'])
        .order('scheduled_for', { ascending: true })

      if (error) throw error

      const transformed = data?.map(item => ({
        ...item,
        facebook_groups: Array.isArray(item.facebook_groups) ? item.facebook_groups[0] : item.facebook_groups,
        territories: Array.isArray(item.territories) ? item.territories[0] : item.territories
      })) || []

      setSchedules(transformed as PostSchedule[])
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.info('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateContent = async (schedule: PostSchedule) => {
    if (!confirm('Generate fresh content for this post? This will replace any existing content.')) {
      return
    }

    setRegeneratingId(schedule.id)
    try {
      const response = await fetch(`/api/schedules/${schedule.id}/regenerate`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate content')
      }

      toast.success('Content regenerated successfully!')      
      await loadSchedules()
    } catch (error) {
      console.error('Error regenerating:', error)
      alert(error instanceof Error ? error.message : 'Failed to regenerate content')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSendReminder = async (schedule: PostSchedule) => {
    if (!schedule.generated_content) {
      toast.success('No content generated yet. Please regenerate content first.')
      return
    }

    if (!confirm(`Send reminder email now for "${schedule.facebook_groups.name}"?`)) {
      return
    }

    setSendingReminderId(schedule.id)
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder')
      }

      toast.success('Reminder email sent successfully! ✅ Check your inbox.')
      await loadSchedules()
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert(error instanceof Error ? error.message : 'Failed to send reminder')
    } finally {
      setSendingReminderId(null)
    }
  }

  const handleMarkAsPosted = async (scheduleId: string) => {
    if (!confirm('Mark this post as posted? This will move it to your posting history.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('post_schedules')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('Marked as posted!')      
      await loadSchedules()
    } catch (error) {
      console.error('Error marking as posted:', error)
      toast.info('Failed to mark as posted')
    }
  }

  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Cancel this scheduled post?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('post_schedules')
        .update({ status: 'cancelled' })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('Schedule cancelled')      
      await loadSchedules()
    } catch (error) {
      console.error('Error cancelling:', error)
      toast.info('Failed to cancel schedule')
    }
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Permanently delete this schedule? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('post_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('Schedule deleted')      
      await loadSchedules()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.info('Failed to delete schedule')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      content_ready: 'bg-green-100 text-green-800 border-green-300',
      posted: 'bg-blue-100 text-blue-800 border-blue-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    
    const labels = {
      scheduled: '⏳ Scheduled',
      content_ready: '✅ Content Ready',
      posted: '📤 Posted',
      cancelled: '❌ Cancelled'
    }

    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border-2 ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    })
  }

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date()
  }

  if (loading) {
    return <PostsListSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Manage your upcoming posts and posting history
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/posts/schedule')}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-3 min-h-[44px] rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Schedule New Post</span>
          <span className="sm:hidden">New Post</span>
        </button>
      </div>

      {/* Stats Cards - Mobile: 2 cols, Desktop: 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-4 sm:p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Scheduled</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {schedules.filter(s => s.status === 'scheduled').length}
              </p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-4 sm:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Content Ready</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {schedules.filter(s => s.status === 'content_ready').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-4 sm:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Posted</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {schedules.filter(s => s.status === 'posted').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-4 sm:p-6 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {schedules.length}
              </p>
            </div>
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No schedules yet</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Create your first scheduled post to get started
          </p>
          <button
            onClick={() => router.push('/dashboard/posts/schedule')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 min-h-[44px] rounded-lg font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Schedule New Post
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow-sm p-4 sm:p-4 sm:p-6 border-2 border-gray-200 hover:border-red-300 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {getStatusBadge(schedule.status)}
                    {!isUpcoming(schedule.scheduled_for) && schedule.status !== 'posted' && (
                      <span className="px-2 sm:px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold border-2 border-red-300">
                        ⚠️ Overdue
                      </span>
                    )}
                    {schedule.reminder_sent && (
                      <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        📧 Reminder
                      </span>
                    )}
                  </div>

                  {/* Info Row - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:p-6 mb-3">
                    <div className="flex items-center gap-2 text-gray-900">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                      <span className="font-semibold text-sm sm:text-base truncate">{schedule.facebook_groups.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="text-xs sm:text-sm">{formatDate(schedule.scheduled_for)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-xs sm:text-sm capitalize">{schedule.post_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {schedule.target_audience && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">
                      🎯 Target: {schedule.target_audience}
                    </p>
                  )}

                  {schedule.special_context && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                      📝 Context: {schedule.special_context}
                    </p>
                  )}

                  {/* Content Status */}
                  {schedule.generated_content && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs sm:text-sm text-green-800">
                        ✅ Content generated: {schedule.content_generated_at ? new Date(schedule.content_generated_at).toLocaleString() : 'Recently'}
                        {' · '}
                        {schedule.generated_content.length} characters
                      </p>
                    </div>
                  )}

                  {!schedule.generated_content && schedule.status === 'scheduled' && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs sm:text-sm text-yellow-800">
                        ⏳ Content will be generated 2 hours before scheduled time
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Stack on mobile */}
                <div className="flex flex-col gap-2 w-full lg:w-auto lg:ml-6">
                  {schedule.generated_content && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedSchedule(schedule)
                          setShowContentModal(true)
                        }}
                        className="px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Content
                      </button>

                      <button
                        onClick={() => handleSendReminder(schedule)}
                        disabled={sendingReminderId === schedule.id}
                        className="px-4 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        title="Send reminder email now"
                      >
                        <Mail className="w-4 h-4" />
                        {sendingReminderId === schedule.id ? 'Sending...' : 'Send Reminder'}
                      </button>
                    </>
                  )}

                  {schedule.status !== 'posted' && (
                    <button
                      onClick={() => handleRegenerateContent(schedule)}
                      disabled={regeneratingId === schedule.id}
                      className="px-4 py-2.5 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={`w-4 h-4 ${regeneratingId === schedule.id ? 'animate-spin' : ''}`} />
                      {regeneratingId === schedule.id ? 'Generating...' : 'Regenerate'}
                    </button>
                  )}

                  {schedule.status === 'content_ready' && (
                    <button
                      onClick={() => handleMarkAsPosted(schedule.id)}
                      className="px-4 py-2.5 min-h-[44px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Posted
                    </button>
                  )}

                  {schedule.status !== 'posted' && (
                    <button
                      onClick={() => handleCancel(schedule.id)}
                      className="px-4 py-2.5 min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="px-4 py-2.5 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Mobile Optimized */}
      {showContentModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Generated Content</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                    {selectedSchedule.facebook_groups.name} • {formatDate(selectedSchedule.scheduled_for)}
                  </p>
                </div>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <pre className="whitespace-pre-wrap font-sans text-gray-900 text-sm leading-relaxed">
                  {selectedSchedule.generated_content}
                </pre>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  💡 <strong>Pro Tip:</strong> Select all (Cmd/Ctrl+A), copy (Cmd/Ctrl+C), then paste directly into Facebook!
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (selectedSchedule.generated_content) {
                    navigator.clipboard.writeText(selectedSchedule.generated_content)
                    toast.success('Content copied to clipboard!')                  }
                }}
                className="flex-1 px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                📋 Copy to Clipboard
              </button>
              {selectedSchedule.facebook_groups.group_url && (
                <a
                  href={selectedSchedule.facebook_groups.group_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  Go to Facebook Group →
                </a>
              )}
              <button
                onClick={() => setShowContentModal(false)}
                className="px-6 py-3 min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}