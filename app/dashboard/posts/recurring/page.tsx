// app/dashboard/posts/recurring/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { RotateCw, Pause, Play, StopCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

type RecurringSeries = {
  id: string
  scheduled_for: string
  post_type: string
  is_recurring: boolean
  recurrence_pattern: string
  recurrence_end_date: string | null
  status: string
  target_audience: string | null
  special_context: string | null
  facebook_groups: {
    name: string
    territories?: {
      name: string
    }
  } | null
  occurrences: {
    id: string
    scheduled_for: string
    status: string
  }[]
}

export default function RecurringPostsPage() {
  const [series, setSeries] = useState<RecurringSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    loadRecurringSeries()
  }, [])

  const loadRecurringSeries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all recurring posts that are parents (no parent_schedule_id)
      const { data: parentPosts, error } = await supabase
        .from('post_schedules')
        .select(`
          *,
          facebook_groups (name, territories(name))
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .is('parent_schedule_id', null)
        .order('scheduled_for', { ascending: false })

      if (error) throw error

      // For each parent, get all child occurrences
      const seriesWithOccurrences = await Promise.all(
        (parentPosts || []).map(async (parent) => {
          const { data: children } = await supabase
            .from('post_schedules')
            .select('id, scheduled_for, status')
            .eq('parent_schedule_id', parent.id)
            .order('scheduled_for', { ascending: true })

          return {
            ...parent,
            occurrences: [
              { id: parent.id, scheduled_for: parent.scheduled_for, status: parent.status },
              ...(children || [])
            ]
          }
        })
      )

      setSeries(seriesWithOccurrences)
    } catch (err) {
      console.error('Error loading recurring series:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (seriesId: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev)
      if (next.has(seriesId)) {
        next.delete(seriesId)
      } else {
        next.add(seriesId)
      }
      return next
    })
  }

  const pauseSeries = async (seriesId: string) => {
    if (!confirm('Pause this recurring series? Future posts will not be created.')) return

    try {
      const { error } = await supabase.rpc('toggle_recurring_series', {
        series_id: seriesId,
        should_pause: true
      })

      if (error) throw error
      toast.success('Series paused successfully')
      loadRecurringSeries()
    } catch (err) {
      console.error('Error pausing series:', err)
      toast.info('Failed to pause series')
    }
  }

  const resumeSeries = async (seriesId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_recurring_series', {
        series_id: seriesId,
        should_pause: false
      })

      if (error) throw error
      toast.success('Series resumed successfully')
      loadRecurringSeries()
    } catch (err) {
      console.error('Error resuming series:', err)
      toast.info('Failed to resume series')
    }
  }

  const endSeries = async (seriesId: string) => {
    if (!confirm('End this recurring series? All future posts will be cancelled.')) return

    try {
      const { error } = await supabase.rpc('end_recurring_series', {
        series_id: seriesId
      })

      if (error) throw error
      toast.success('Series ended successfully')
      loadRecurringSeries()
    } catch (err) {
      console.error('Error ending series:', err)
      toast.info('Failed to end series')
    }
  }

  const getPatternDisplay = (pattern: string) => {
    const patterns: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Every 2 Weeks',
      monthly: 'Monthly'
    }
    return patterns[pattern] || pattern
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800'
      case 'content_ready':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RotateCw className="w-8 h-8 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading recurring posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-3">
          <RotateCw className="w-8 h-8" />
          Recurring Posts
        </h1>
        <p className="mt-2 text-purple-100">
          Manage your recurring post series and upcoming occurrences
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Series</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
              {series.filter(s => s.status !== 'cancelled' && s.status !== 'paused').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Series</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{series.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paused</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-600">
              {series.filter(s => s.status === 'paused').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Occurrences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
              {series.reduce((sum, s) => sum + s.occurrences.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Series List */}
      {series.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <RotateCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recurring Posts</h3>
            <p className="text-gray-600 mb-6">
              You haven't created any recurring posts yet.
            </p>
            <a
              href="/dashboard/posts/schedule"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Calendar className="w-4 h-4" />
              Schedule Your First Post
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {series.map((item) => {
            const isExpanded = expandedSeries.has(item.id)
            const completedCount = item.occurrences.filter(o => o.status === 'posted').length
            const upcomingCount = item.occurrences.filter(o => 
              o.status !== 'posted' && o.status !== 'cancelled'
            ).length
            const isPaused = item.status === 'paused'

            return (
              <Card key={item.id} className={isPaused ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {item.facebook_groups?.name || 'Unknown Group'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                          {item.status === 'paused' ? 'Paused' : 'Active'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                          {getPatternDisplay(item.recurrence_pattern)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-600">
                        <span className="capitalize">{item.post_type.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{completedCount} completed</span>
                        <span>•</span>
                        <span>{upcomingCount} upcoming</span>
                        {item.recurrence_end_date && (
                          <>
                            <span>•</span>
                            <span>Ends {new Date(item.recurrence_end_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPaused ? (
                        <button
                          onClick={() => resumeSeries(item.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Resume
                        </button>
                      ) : (
                        <button
                          onClick={() => pauseSeries(item.id)}
                          className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1 text-sm"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => endSeries(item.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 text-sm"
                      >
                        <StopCircle className="w-4 h-4" />
                        End
                      </button>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">All Occurrences</h4>
                      <div className="space-y-2">
                        {item.occurrences.map((occurrence, index) => {
                          const occurrenceDate = new Date(occurrence.scheduled_for)
                          const isPast = occurrenceDate < new Date()
                          
                          return (
                            <div
                              key={occurrence.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600 w-8">
                                  #{index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {occurrenceDate.toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {occurrenceDate.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(occurrence.status)}`}>
                                  {occurrence.status === 'content_ready' ? 'Ready' : 
                                   occurrence.status.charAt(0).toUpperCase() + occurrence.status.slice(1)}
                                </span>
                                {isPast && occurrence.status !== 'posted' && (
                                  <span className="text-xs text-red-600 font-medium">Overdue</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}