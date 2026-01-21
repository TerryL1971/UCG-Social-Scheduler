'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
}

type TestimonialData = {
  customerName: string
  vehicle: string
  experience: string
}

export default function CreateSchedulePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [userTerritories, setUserTerritories] = useState<string[]>([])
  const [primaryTerritoryId, setPrimaryTerritoryId] = useState<string | null>(null)
  
  // Form state
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [occasion, setOccasion] = useState('')
  const [minDate, setMinDate] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [specialOffer, setSpecialOffer] = useState('')
  
  // Vehicle data
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    make: '',
    model: '',
    year: '',
    price: '',
    features: ''
  })
  
  // Testimonial data
  const [testimonialData, setTestimonialData] = useState<TestimonialData>({
    customerName: '',
    vehicle: '',
    experience: ''
  })

  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0])
    loadGroups()
    loadUserTerritories()
  }, [])

  async function loadGroups() {
    try {
      console.log('🔍 Loading groups for schedule page...')
      
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

      if (error) {
        console.error('❌ Error loading groups:', error)
        throw error
      }

      console.log('✅ Raw groups data:', data)

      // Flatten territories array to single object
      const flattenedData = data?.map(group => ({
        ...group,
        territories: Array.isArray(group.territories) 
          ? group.territories[0] 
          : group.territories
      })) || []

      console.log('✅ Flattened groups:', flattenedData)
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

    // Check for territory violation
    const selectedGroup = groups.find(g => g.id === selectedGroupId)
    
    // If user has no territories assigned, treat ANY group with a territory as a violation
    const hasViolation = selectedGroup?.territory_id && (
      userTerritories.length === 0 || 
      !userTerritories.includes(selectedGroup.territory_id)
    )
    
    console.log('🔍 Territory check:', {
      selectedGroup: selectedGroup?.name,
      groupTerritory: selectedGroup?.territory_id,
      userTerritories,
      hasViolation
    })
    
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

      // Combine date and time
      const scheduledFor = `${scheduledDate}T${scheduledTime}:00`

      // Prepare AI metadata with all the generation parameters
      const aiMetadata = {
        post_type: postType,
        special_context: occasion || null,
        target_audience: targetAudience || null,
        special_offer: (postType === 'special_offer' && specialOffer) ? specialOffer : null,
        vehicle_data: (postType === 'vehicle_spotlight' || postType === 'special_offer') && vehicleData.make 
          ? vehicleData 
          : null,
        testimonial_data: postType === 'testimonial_style' && testimonialData.customerName 
          ? testimonialData 
          : null
      }

      const saveData = {
        user_id: user.id,
        group_id: selectedGroupId,
        territory_id: selectedGroup.territory_id,
        scheduled_for: scheduledFor,
        post_type: postType,
        status: 'scheduled',
        territory_violation_acknowledged: acknowledgeViolation,
        is_ai_generated: true,
        ai_metadata: aiMetadata,
        notes: occasion || null,
        generated_content: '' // Empty string as placeholder - will be generated by cron job
      }

      console.log('📅 Scheduling post:', saveData)

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert(saveData)
        .select()

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Post scheduled successfully:', data)
      alert('Post scheduled successfully! The system will generate content before posting.')
      setShowViolationModal(false)
      router.push('/dashboard/posts')
      
    } catch (error: any) {
      console.error('❌ Schedule error:', error)
      alert(`Failed to schedule post: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">Loading groups...</div>
      </div>
    )
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posts
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          Schedule Post for Future Generation
        </h1>
        <p className="text-gray-600 mt-2">
          Schedule a post to be automatically generated by AI and ready for posting at the specified time
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Step 1: Select Group */}
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

        {/* Step 2: Post Type */}
        <div className="mb-8">
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Post Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {/* Special Offer Details */}
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

        {/* Vehicle Information */}
        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 mb-4">🚗 Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Testimonial Information */}
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

        {/* Step 3: Occasion (Optional) */}
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

        {/* Target Audience */}
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

        {/* Step 4: Schedule Date & Time */}
        <div className="mb-8">
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            When to Generate & Post
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard/posts')}
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
              <>Scheduling...</>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Schedule Post
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The AI will automatically generate content for this post shortly before the scheduled time. 
            You'll receive a reminder email to review and post the content.
          </p>
        </div>
      </div>

      {/* Territory Violation Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
                {saving ? 'Scheduling...' : 'Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}