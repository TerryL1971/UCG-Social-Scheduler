// app/dashboard/posts/schedule/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Calendar, Users, MapPin, Wand2, Save, Eye, RotateCw, AlertCircle } from 'lucide-react'

type FacebookGroup = {
  id: string
  name: string
  territory_id: string
  group_type?: string
  description?: string
  max_posts_per_month?: number
  min_days_between_posts?: number
  group_environment?: string
  territories?: {
    name: string
  }
}

type PostType = 'brand_awareness' | 'vehicle_spotlight' | 'special_offer' | 'community' | 'testimonial_style'

type VehicleData = {
  make: string
  model: string
  year: string
  price: string
  features: string
  condition: string
  mileage: string
}

type TestimonialData = {
  customerName: string
  vehicle: string
  experience: string
  location: string
}

type GroupPostingRules = {
  can_post: boolean
  reason: string
  next_available_date: string
  posts_this_month: number
  days_since_last_post: number
}

export default function CreateSchedulePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [postingRules, setPostingRules] = useState<GroupPostingRules | null>(null)
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [specialContext, setSpecialContext] = useState('')
  
  // Recurring settings
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  
  // Type-specific data
  const [specialOffer, setSpecialOffer] = useState('')
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    make: '',
    model: '',
    year: '',
    price: '',
    features: '',
    condition: 'excellent',
    mileage: ''
  })
  const [testimonialData, setTestimonialData] = useState<TestimonialData>({
    customerName: '',
    vehicle: '',
    experience: '',
    location: ''
  })
  
  // Preview state
  const [previewContent, setPreviewContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadGroups()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedGroup && scheduledDate && scheduledTime) {
      checkPostingRules()
    } else {
      setPostingRules(null)
    }
  }, [selectedGroup, scheduledDate, scheduledTime]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: groupsError } = await supabase
        .from('facebook_groups')
        .select('*, territories(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (groupsError) throw groupsError
      setGroups(data || [])
    } catch (err) {
      console.error('Error loading groups:', err)
    }
  }

  const checkPostingRules = async () => {
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
      
      const { data, error } = await supabase
        .rpc('check_group_posting_rules', {
          p_group_id: selectedGroup,
          p_scheduled_for: scheduledFor
        })

      if (error) throw error
      
      if (data && data.length > 0) {
        setPostingRules(data[0])
      }
    } catch (err) {
      console.error('Error checking posting rules:', err)
    }
  }

  const handlePreview = async () => {
    if (!selectedGroup) {
      alert('Please select a Facebook group')
      return
    }

    setPreviewing(true)
    setError(null)
    
    try {
      const group = groups.find(g => g.id === selectedGroup)
      if (!group) throw new Error('Group not found')

      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: group.name,
          groupType: group.group_type,
          territory: group.territories?.name || 'Unknown',
          groupDescription: group.description,
          postType,
          specialOffer: postType === 'special_offer' ? specialOffer : undefined,
          targetAudience,
          additionalContext: specialContext,
          vehicleData: (postType === 'vehicle_spotlight' || postType === 'special_offer') ? vehicleData : undefined,
          testimonialData: postType === 'testimonial_style' ? testimonialData : undefined
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate preview')
      }

      setPreviewContent(data.content)
      setShowPreview(true)
      
    } catch (err) {
      console.error('Preview error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate preview'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setPreviewing(false)
    }
  }

  const handleSchedule = async () => {
    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!selectedGroup || !scheduledDate || !scheduledTime) {
      alert('Please fill in all required fields (group, date, and time)')
      return
    }
    
    if (!timeRegex.test(scheduledTime)) {
      alert('Invalid time format. Please use HH:MM in 24-hour format (e.g., 14:30)')
      return
    }

    // Check posting rules
    if (postingRules && !postingRules.can_post) {
      if (!confirm(`Warning: ${postingRules.reason}\n\nNext available: ${new Date(postingRules.next_available_date).toLocaleDateString()}\n\nSchedule anyway?`)) {
        return
      }
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const group = groups.find(g => g.id === selectedGroup)
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`)

      // Create schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('post_schedules')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          scheduled_for: scheduledFor.toISOString(),
          post_type: postType,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          recurrence_interval: isRecurring ? 1 : null,
          recurrence_end_date: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
          target_audience: targetAudience || null,
          special_context: specialContext || null,
          vehicle_data: (postType === 'vehicle_spotlight' || postType === 'special_offer') ? vehicleData : null,
          testimonial_data: postType === 'testimonial_style' ? testimonialData : null,
          special_offer: postType === 'special_offer' ? specialOffer : null,
          status: 'scheduled'
        })
        .select()

      if (scheduleError) {
        console.error('Supabase error:', scheduleError)
        throw scheduleError
      }

      console.log('Schedule created:', schedule)
      
      let message = 'Post scheduled successfully! ✅\n\n'
      message += 'Fresh content will be generated 2 hours before posting time.'
      
      if (isRecurring) {
        message += `\n\nThis will repeat ${recurrencePattern} until ${recurrenceEndDate || 'cancelled'}.`
      }
      
      alert(message)
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('Error scheduling post:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to schedule post'
      setError(errorMsg)
      alert('Error: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-8 h-8" />
          Schedule Post
        </h1>
        <p className="mt-2 text-red-100">
          Schedule when to post - fresh content will be generated at reminder time
        </p>
      </div>

      {/* Step 1: Select Group & Date/Time */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          Step 1: When & Where
        </h2>
        
        {/* Group Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Facebook Group *
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
                <MapPin className="w-4 h-4 text-red-600" />
                <strong>Territory:</strong> {selectedGroupData.territories?.name}
              </p>
              {selectedGroupData.max_posts_per_month && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Limit:</strong> Max {selectedGroupData.max_posts_per_month} posts per month
                </p>
              )}
              {selectedGroupData.min_days_between_posts && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Spacing:</strong> Min {selectedGroupData.min_days_between_posts} days between posts
                </p>
              )}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time * (HH:MM in 24-hour format)
            </label>
            <input
              type="text"
              value={scheduledTime}
              onChange={(e) => {
                let value = e.target.value
                value = value.replace(/[^\d:]/g, '')
                if (value.length === 4 && !value.includes(':')) {
                  value = value.substring(0, 2) + ':' + value.substring(2)
                }
                if (value.length <= 5) {
                  setScheduledTime(value)
                }
              }}
              onBlur={(e) => {
                const value = e.target.value
                const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
                if (value && !timeRegex.test(value)) {
                  alert('Invalid time format. Please use HH:MM (e.g., 14:30)')
                  setScheduledTime('')
                }
              }}
              placeholder="14:30"
              maxLength={5}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-mono text-lg"
            />
            {scheduledTime && /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime) && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Valid time: {scheduledTime}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Examples: 09:00, 14:30, 18:45
            </p>
          </div>
        </div>

        {/* Posting Rules Warning */}
        {postingRules && !postingRules.can_post && (
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Posting Rule Conflict
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {postingRules.reason}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Posts this month: {postingRules.posts_this_month} • Days since last post: {postingRules.days_since_last_post}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Next available: {new Date(postingRules.next_available_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {postingRules && postingRules.can_post && (
          <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
            <div className="flex items-start">
              <div className="text-green-600 mt-0.5 mr-3">✓</div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  OK to Post
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Posts this month: {postingRules.posts_this_month} • Days since last post: {postingRules.days_since_last_post}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Settings */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Make this a recurring post
            </span>
          </label>

          {isRecurring && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat Pattern
                  </label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value as 'daily' | 'weekly' | 'biweekly' | 'monthly')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={scheduledDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                💡 The system will automatically create the next occurrence after each post
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Post Type & Context */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 2: Post Type & Generation Context
        </h2>
        
        {/* Post Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Community-focused, relationship building' },
            { value: 'vehicle_spotlight', label: 'Vehicle Spotlight', desc: 'Highlight specific vehicles' },
            { value: 'special_offer', label: 'Special Offer', desc: 'Promote a specific deal' },
            { value: 'community', label: 'Community Focus', desc: 'Emphasize military service' },
            { value: 'testimonial_style', label: 'Success Story', desc: 'Share customer experience' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setPostType(type.value as PostType)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                postType === type.value
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <p className="font-semibold text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Type-specific inputs (same as before) */}
        {postType === 'special_offer' && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Offer Details
            </label>
            <textarea
              value={specialOffer}
              onChange={(e) => setSpecialOffer(e.target.value)}
              placeholder="e.g., 10% off military pricing, free warranty upgrade..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              rows={2}
            />
          </div>
        )}

        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 mb-4">🚗 Vehicle Information (Optional - can be added later)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={vehicleData.make}
                onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                placeholder="Make (e.g., Toyota)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                value={vehicleData.model}
                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                placeholder="Model (e.g., Camry)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                value={vehicleData.year}
                onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                placeholder="Year (e.g., 2020)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                value={vehicleData.price}
                onChange={(e) => setVehicleData({...vehicleData, price: e.target.value})}
                placeholder="Price (optional)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        )}

        {postType === 'testimonial_style' && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
            <h3 className="font-semibold text-gray-900 mb-4">⭐ Customer Story Details</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={testimonialData.customerName}
                onChange={(e) => setTestimonialData({...testimonialData, customerName: e.target.value})}
                placeholder="Customer name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                value={testimonialData.vehicle}
                onChange={(e) => setTestimonialData({...testimonialData, vehicle: e.target.value})}
                placeholder="Vehicle purchased"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        )}

        {/* Generation Context */}
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">📝 Generation Context (Optional)</h3>
          <p className="text-sm text-gray-600 mb-4">
            This context will be used when generating fresh content at reminder time
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., young families, new arrivals, first-time buyers"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Context
              </label>
              <textarea
                value={specialContext}
                onChange={(e) => setSpecialContext(e.target.value)}
                placeholder="e.g., PCS season, holiday sale, new inventory arriving, urgent deadline..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 This helps AI generate timely, relevant content when it&apos;s actually posted
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview (Optional) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-6 h-6 text-red-600" />
            Preview (Optional)
          </h2>
          <button
            onClick={handlePreview}
            disabled={!selectedGroup || previewing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {previewing ? 'Generating...' : 'Preview Content'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Generate a preview now to see what the post might look like. Note: Actual content will be freshly generated at reminder time.
        </p>

        {showPreview && previewContent && (
          <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Preview Content:</p>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{previewContent}</pre>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Schedule Button */}
      <button
        onClick={handleSchedule}
        disabled={loading || !selectedGroup || !scheduledDate || !scheduledTime}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
      >
        <Save className="w-6 h-6" />
        {loading ? 'Scheduling...' : 'Schedule Post'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Fresh content will be generated 2 hours before your scheduled time
      </p>
    </div>
  )
}