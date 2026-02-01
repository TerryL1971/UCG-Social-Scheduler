// app/dashboard/posts/schedule/page.tsx

'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Users, MapPin, Sparkles, ArrowLeft } from 'lucide-react'

type FacebookGroup = {
  id: string
  name: string
  territory_id: string
  territories: {
    name: string
  } | null
}

type PostType = 'brand_awareness' | 'vehicle_spotlight' | 'special_offer' | 'community' | 'testimonial_style'

type VehicleData = {
  make: string
  model: string
  year: string
  price: string
  features: string
  condition?: string
  mileage?: string
}

type TestimonialData = {
  customerName: string
  vehicle: string
  experience: string
  location?: string
}

function SchedulePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [userTerritories, setUserTerritories] = useState<string[]>([])
  const [primaryTerritoryId, setPrimaryTerritoryId] = useState<string | null>(null)
  
  const scheduleId = searchParams.get('scheduleId')
  const isEditMode = !!scheduleId
  
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [occasion, setOccasion] = useState('')
  const [minDate, setMinDate] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [specialOffer, setSpecialOffer] = useState('')
  
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    make: '',
    model: '',
    year: '',
    price: '',
    features: '',
    condition: 'eu_spec',
    mileage: ''
  })
  
  const [testimonialData, setTestimonialData] = useState<TestimonialData>({
    customerName: '',
    vehicle: '',
    experience: '',
    location: ''
  })

  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0])
    loadGroups()
    loadUserTerritories()
  }, [])

  useEffect(() => {
    if (groups.length > 0 && searchParams.get('groupId')) {
      const groupId = searchParams.get('groupId')
      const scheduledFor = searchParams.get('scheduledFor')
      const postTypeParam = searchParams.get('postType')
      const notesParam = searchParams.get('notes')
      const metadataParam = searchParams.get('metadata')
      
      if (groupId) setSelectedGroupId(groupId)
      
      if (scheduledFor) {
        const date = new Date(scheduledFor)
        setScheduledDate(date.toISOString().split('T')[0])
        setScheduledTime(date.toTimeString().slice(0, 5))
      }

      if (postTypeParam) setPostType(postTypeParam as PostType)
      if (notesParam) setOccasion(notesParam)

      if (metadataParam) {
        try {
          const metadata = JSON.parse(metadataParam)
          if (metadata.target_audience) setTargetAudience(metadata.target_audience)
          if (metadata.special_offer) setSpecialOffer(metadata.special_offer)
          if (metadata.vehicle_data) setVehicleData(metadata.vehicle_data)
          if (metadata.testimonial_data) setTestimonialData(metadata.testimonial_data)
        } catch (e) {
          console.error('Error parsing metadata:', e)
        }
      }
    }
  }, [groups, searchParams])

  async function loadGroups() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('facebook_groups')
        .select(`
          id,
          name,
          territory_id,
          territories (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const flattenedData = data?.map(group => ({
        ...group,
        territories: Array.isArray(group.territories) 
          ? group.territories[0] 
          : group.territories
      })) || []

      setGroups(flattenedData)
    } catch (error) {
      console.error('Error loading groups:', error)
      alert('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserTerritories() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profile_territories')
        .select('territory_id, is_primary')
        .eq('profile_id', user.id)

      if (error) throw error

      const territoryIds = data?.map(pt => pt.territory_id) || []
      const primary = data?.find(pt => pt.is_primary)

      setUserTerritories(territoryIds)
      setPrimaryTerritoryId(primary?.territory_id || territoryIds[0] || null)
    } catch (error) {
      console.error('Error loading user territories:', error)
    }
  }

  async function handleSchedule() {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!selectedGroupId || !scheduledDate || !scheduledTime) {
      alert('Please fill in all required fields')
      return
    }
    
    if (!timeRegex.test(scheduledTime)) {
      alert('Invalid time format. Please use HH:MM in 24-hour format (e.g., 14:30, 09:00, 23:45)')
      return
    }

    const selectedGroup = groups.find(g => g.id === selectedGroupId)
    
    const hasViolation = selectedGroup?.territory_id && (
      userTerritories.length === 0 || 
      !userTerritories.includes(selectedGroup.territory_id)
    )
    
    if (hasViolation) {
      setShowViolationModal(true)
      return
    }

    await saveScheduledPost(false)
  }

  async function saveScheduledPost(acknowledgeViolation: boolean) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const selectedGroup = groups.find(g => g.id === selectedGroupId)
      if (!selectedGroup) throw new Error('Group not found')

      const scheduledFor = `${scheduledDate}T${scheduledTime}:00`

      const saveData = {
        user_id: user.id,
        group_id: selectedGroupId,
        territory_id: selectedGroup.territory_id,
        scheduled_for: scheduledFor,
        post_type: postType,
        status: 'scheduled',
        territory_violation_acknowledged: acknowledgeViolation,
        violation_status: acknowledgeViolation ? 'unresolved' : null,
        target_audience: targetAudience || null,
        special_context: occasion || null,
        special_offer: (postType === 'special_offer' && specialOffer) ? specialOffer : null,
        vehicle_data: (postType === 'vehicle_spotlight' || postType === 'special_offer') && vehicleData.make 
          ? vehicleData 
          : null,
        testimonial_data: postType === 'testimonial_style' && testimonialData.customerName 
          ? testimonialData 
          : null
      }

      let result
      if (isEditMode && scheduleId) {
        result = await supabase
          .from('post_schedules')
          .update(saveData)
          .eq('id', scheduleId)
          .select()
      } else {
        result = await supabase
          .from('post_schedules')
          .insert(saveData)
          .select()
      }

      if (result.error) throw result.error

      const message = isEditMode 
        ? 'Post rescheduled successfully! The system will generate new content before posting.'
        : 'Post scheduled successfully! The system will generate content before posting.'
      
      alert(message)
      setShowViolationModal(false)
      router.push(isEditMode ? '/dashboard/my-violations' : '/dashboard/posts')
      
    } catch (error: any) {
      console.error('Schedule error:', error)
      alert(`Failed to ${isEditMode ? 'update' : 'schedule'} post: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="animate-pulse">Loading groups...</div>
      </div>
    )
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push(isEditMode ? '/dashboard/my-violations' : '/dashboard/posts')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEditMode ? 'Back to Violations' : 'Back to Posts'}
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          {isEditMode ? 'Edit & Reschedule Post' : 'Schedule Post for Future Generation'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isEditMode 
            ? 'Update your scheduling parameters and regenerate content for this post'
            : 'Schedule a post to be automatically generated by AI and ready for posting at the specified time'
          }
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            Select Facebook Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Choose a group...</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.territories?.name || 'No territory'})
              </option>
            ))}
          </select>

          {selectedGroup && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-800">
              <MapPin className="w-4 h-4" />
              Territory: {selectedGroup.territories?.name || 'Unknown'}
            </div>
          )}
        </div>

        <div className="mb-8">
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Post Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Community-focused, relationship building' },
              { value: 'vehicle_spotlight', label: 'Vehicle Spotlight', desc: 'Highlight specific vehicles' },
              { value: 'special_offer', label: 'Special Offer', desc: 'Promote a specific deal' },
              { value: 'testimonial_style', label: 'Success Story', desc: 'Share customer experience' },
              { value: 'community', label: 'Community Focus', desc: 'Emphasize military service' }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setPostType(type.value as PostType)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  postType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-600">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {postType === 'special_offer' && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Offer Details
            </label>
            <textarea
              value={specialOffer}
              onChange={(e) => setSpecialOffer(e.target.value)}
              placeholder="e.g., 10% off military pricing, free warranty upgrade, $500 trade-in bonus..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
        )}

        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 mb-4">🚗 Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <input
                type="text"
                value={vehicleData.make}
                onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                placeholder="Make (e.g., Toyota)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={vehicleData.model}
                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                placeholder="Model (e.g., Camry)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={vehicleData.year}
                onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                placeholder="Year (e.g., 2020)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={vehicleData.price}
                onChange={(e) => setVehicleData({...vehicleData, price: e.target.value})}
                placeholder="Price (optional)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={vehicleData.mileage}
                onChange={(e) => setVehicleData({...vehicleData, mileage: e.target.value})}
                placeholder="Mileage (optional)"
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={vehicleData.condition}
                onChange={(e) => setVehicleData({...vehicleData, condition: e.target.value})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="eu_spec">EU Spec</option>
                <option value="us_spec">US Spec</option>
              </select>
            </div>
            <textarea
              value={vehicleData.features}
              onChange={(e) => setVehicleData({...vehicleData, features: e.target.value})}
              placeholder="Key features (e.g., Navigation, heated seats, AWD...)"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-4"
              rows={2}
            />
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
                placeholder="Customer name (or 'a military family')"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={testimonialData.vehicle}
                onChange={(e) => setTestimonialData({...testimonialData, vehicle: e.target.value})}
                placeholder="Vehicle purchased"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={testimonialData.location || ''}
                onChange={(e) => setTestimonialData({...testimonialData, location: e.target.value})}
                placeholder="Location (optional)"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={testimonialData.experience}
                onChange={(e) => setTestimonialData({...testimonialData, experience: e.target.value})}
                placeholder="Their experience/need..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        )}

        <div className="mb-8">
          <label className="text-lg font-semibold text-gray-900 mb-3 block">
            Occasion or Theme (Optional)
          </label>
          <input
            type="text"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g., Memorial Day, New Inventory Sale, Tax Season..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-8">
          <label className="text-lg font-semibold text-gray-900 mb-3 block">
            Target Audience (Optional)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g., young families, new arrivals, first-time buyers"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-8">
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            When to Generate & Post
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={minDate}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time (HH:MM in 24-hour format)
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d:]/g, '')
                  if (value.length === 4 && !value.includes(':')) {
                    value = value.substring(0, 2) + ':' + value.substring(2)
                  }
                  if (value.length <= 5) {
                    setScheduledTime(value)
                  }
                }}
                placeholder="14:30"
                maxLength={5}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Examples: 09:00, 14:30, 18:45, 23:59</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => router.push(isEditMode ? '/dashboard/my-violations' : '/dashboard/posts')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={saving || !selectedGroupId || !scheduledDate || !scheduledTime}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>{isEditMode ? 'Updating...' : 'Scheduling...'}</>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                {isEditMode ? 'Update Schedule' : 'Schedule Post'}
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The AI will automatically generate content for this post 2 hours before the scheduled time. 
            You'll receive a reminder email to review and post the content.
          </p>
        </div>
      </div>

      {showViolationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Territory Violation</h3>
                <p className="text-sm text-gray-600">You're posting outside your assigned territory</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-800 mb-2">
                <strong>Selected Group:</strong> {groups.find(g => g.id === selectedGroupId)?.name}
              </p>
              <p className="text-sm text-gray-800 mb-2">
                <strong>Group Territory:</strong> {groups.find(g => g.id === selectedGroupId)?.territories?.name}
              </p>
              <p className="text-sm text-gray-800">
                <strong>Your Territory:</strong> {primaryTerritoryId ? groups.find(g => g.territory_id === primaryTerritoryId)?.territories?.name || 'Unknown' : 'None assigned'}
              </p>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              This violation will be logged and visible to your manager. You'll need to provide justification or request authorization in the "My Violations" page.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowViolationModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveScheduledPost(true)}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (isEditMode ? 'Updating...' : 'Scheduling...') : 'Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreateSchedulePage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  )
}