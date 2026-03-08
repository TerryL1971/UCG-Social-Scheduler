// app/dashboard/posts/schedule-recurring/page.tsx
// OR add this section to your existing Create Post page

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { RotateCw, Calendar, AlertCircle, Sparkles, Users, MapPin } from 'lucide-react'
import { toast } from 'sonner'

type FacebookGroup = {
  id: string
  name: string
  territory_id: string
  territories?: { name: string }
}

type PostType = 'vehicle_spotlight' | 'special_offer' | 'brand_awareness' | 'community' | 'testimonial_style'

export default function ScheduleRecurringPostPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [postContent, setPostContent] = useState('')
  const [specialOffer, setSpecialOffer] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  
  // Recurring settings
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [minDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('facebook_groups')
        .select('id, name, territory_id, territories(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      const flattenedData = data?.map(group => ({
        ...group,
        territories: Array.isArray(group.territories) ? group.territories[0] : group.territories
      })) || []

      setGroups(flattenedData)
    } catch (err) {
      console.error('Error loading groups:', err)
      toast.error('Failed to load groups')
    }
  }

  const handleCreateRecurring = async () => {
    // Validation
    if (!postContent.trim()) {
      toast.warning('Please enter post content')
      return
    }
    
    if (!selectedGroup) {
      toast.warning('Please select a Facebook group')
      return
    }
    
    if (!startDate || !startTime) {
      toast.warning('Please select start date and time')
      return
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime)) {
      toast.warning('Invalid time format. Use HH:MM (e.g., 09:00, 14:30)')
      return
    }

    if (hasEndDate && !endDate) {
      toast.warning('Please select an end date or uncheck "Set end date"')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get group details
      const group = groups.find(g => g.id === selectedGroup)
      
      const scheduledFor = new Date(`${startDate}T${startTime}:00`)
      const recurrenceEndDate = hasEndDate ? new Date(`${endDate}T23:59:59`) : null

      console.log('Creating recurring series:', {
        scheduled_for: scheduledFor.toISOString(),
        recurrence_pattern: recurrencePattern,
        recurrence_end_date: recurrenceEndDate?.toISOString(),
        group_id: selectedGroup,
        territory_id: group?.territory_id
      })

      // Create parent recurring schedule
      const { data: parentPost, error: parentError } = await supabase
        .from('post_schedules')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          scheduled_for: scheduledFor.toISOString(),
          post_type: postType,
          is_recurring: true,
          recurrence_pattern: recurrencePattern,
          recurrence_interval: 1,
          recurrence_end_date: recurrenceEndDate?.toISOString(),
          parent_schedule_id: null, // This is the parent
          generated_content: postContent,
          content_generated_at: new Date().toISOString(),
          status: 'content_ready',
          reminder_sent: false,
          target_audience: targetAudience || null,
          special_context: additionalContext || null,
          special_offer: postType === 'special_offer' ? specialOffer : null
        })
        .select()
        .single()

      console.log('Parent post created:', parentPost, 'Error:', parentError)

      if (parentError) {
        console.error('Supabase error:', parentError)
        throw parentError
      }
      
      if (!parentPost) {
        throw new Error('Failed to create recurring series - no data returned')
      }

      toast.success('Recurring post series created successfully!')
      
      // Redirect to recurring posts page
      router.push('/dashboard/posts/recurring')

    } catch (err) {
      console.error('Error creating recurring post:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Failed to create recurring post: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <RotateCw className="w-8 h-8" />
          Schedule Recurring Post
        </h1>
        <p className="mt-2 text-purple-100">
          Create a post series that repeats automatically
        </p>
      </div>

      {/* Step 1: Select Group */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          Step 1: Select Facebook Group
        </h2>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
        >
          <option value="">Choose a group...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} - {group.territories?.name}
            </option>
          ))}
        </select>
        {selectedGroupData && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <strong>Territory:</strong> {selectedGroupData.territories?.name}
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Post Type */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          Step 2: Choose Post Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Build relationships' },
            { value: 'community', label: 'Community Focus', desc: 'Military emphasis' },
            { value: 'special_offer', label: 'Special Offer', desc: 'Promote deals' },
            { value: 'vehicle_spotlight', label: 'Vehicle Spotlight', desc: 'Feature cars' },
            { value: 'testimonial_style', label: 'Success Story', desc: 'Customer stories' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setPostType(type.value as PostType)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                postType === type.value
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <p className="font-semibold text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Special Offer Details */}
        {postType === 'special_offer' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Offer Details
            </label>
            <textarea
              value={specialOffer}
              onChange={(e) => setSpecialOffer(e.target.value)}
              placeholder="e.g., 10% off military pricing, free warranty upgrade..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              rows={2}
            />
          </div>
        )}

        {/* Additional Context */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience (Optional)
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., young families, new arrivals, first-time buyers"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any other details to help generate better content..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Post Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Step 3: Post Content
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Enter the content that will be used for each recurring post
        </p>
        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder="Your post content here... This will be used for each recurring post."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 font-sans"
          rows={8}
        />
        <p className="text-sm text-gray-500 mt-2">
          {postContent.length} characters
        </p>
      </div>

      {/* Step 4: Recurrence Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          Step 4: Recurrence Settings
        </h2>

        {/* Recurrence Pattern */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repeat Every
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: 'daily', label: 'Daily', desc: 'Every day' },
              { value: 'weekly', label: 'Weekly', desc: 'Every 7 days' },
              { value: 'biweekly', label: 'Bi-Weekly', desc: 'Every 14 days' },
              { value: 'monthly', label: 'Monthly', desc: 'Every 30 days' }
            ].map((pattern) => (
              <button
                key={pattern.value}
                onClick={() => setRecurrencePattern(pattern.value as any)}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  recurrencePattern === pattern.value
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <p className="font-semibold text-gray-900 text-sm">{pattern.label}</p>
                <p className="text-xs text-gray-600 mt-1">{pattern.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Start Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time (HH:MM, 24-hour)
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => {
                let value = e.target.value.replace(/[^\d:]/g, '')
                if (value.length === 4 && !value.includes(':')) {
                  value = value.substring(0, 2) + ':' + value.substring(2)
                }
                if (value.length <= 5) {
                  setStartTime(value)
                }
              }}
              placeholder="09:00"
              maxLength={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: 09:00, 14:30, 18:00
            </p>
          </div>
        </div>

        {/* Optional End Date */}
        <div className="border-t pt-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="hasEndDate"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="hasEndDate" className="ml-2 text-sm font-medium text-gray-700">
              Set end date (optional - leave unchecked for unlimited)
            </label>
          </div>
          
          {hasEndDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || minDate}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Series will end on this date
              </p>
            </div>
          )}
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How recurring posts work:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>First post created for the start date you choose</li>
                <li>New posts generated automatically based on pattern</li>
                <li>Each post uses the same content</li>
                <li>You'll get reminder emails for each occurrence</li>
                <li>Manage all occurrences in Recurring Posts page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreateRecurring}
        disabled={loading || !postContent || !selectedGroup || !startDate || !startTime}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Creating Recurring Series...
          </>
        ) : (
          <>
            <RotateCw className="w-5 h-5" />
            Create Recurring Post Series
          </>
        )}
      </button>
    </div>
  )
}