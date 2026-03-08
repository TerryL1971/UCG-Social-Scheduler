// app/dashboard/posts/schedule/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Users, MapPin, Wand2, Save, ExternalLink, Copy } from 'lucide-react'
import { toast } from 'sonner'

type FacebookGroup = {
  id: string
  name: string
  territory_id: string
  group_type?: string
  description?: string
  facebook_url?: string
  territories?: {
    name: string
  }
}

type PostType = 'vehicle_spotlight' | 'special_offer' | 'brand_awareness' | 'community' | 'testimonial_style'

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

type UserProfile = {
  full_name: string
  email: string
  whatsapp?: string
}

export default function SchedulePostPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState('')
  const [postType, setPostType] = useState<PostType>('vehicle_spotlight')
  const [targetAudience, setTargetAudience] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [specialOffer, setSpecialOffer] = useState('')
  
  // Vehicle data
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    make: '',
    model: '',
    year: '',
    price: '',
    features: '',
    condition: '',
    mileage: ''
  })

  // Testimonial data
  const [testimonialData, setTestimonialData] = useState<TestimonialData>({
    customerName: '',
    vehicle: '',
    experience: '',
    location: ''
  })

  // Content state
  const [generatedContent, setGeneratedContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [minDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadGroups()
    loadUserProfile()
  }, [])

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('facebook_groups')
        .select('id, name, group_type, description, facebook_url, territory_id, territories(name)')
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

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, whatsapp')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const handleGenerateContent = async () => {
    if (!selectedGroup || !postType) {
      toast.warning('Please select a group and post type')
      return
    }

    // Validation for vehicle spotlight
    if ((postType === 'vehicle_spotlight' || postType === 'special_offer') && !vehicleData.make) {
      toast.warning('Please enter vehicle details for this post type')
      return
    }

    // Validation for testimonial
    if (postType === 'testimonial_style' && !testimonialData.customerName) {
      toast.warning('Please enter customer testimonial details')
      return
    }

    setGenerating(true)
    setError('')

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
          additionalContext,
          vehicleData: (postType === 'vehicle_spotlight' || postType === 'special_offer') ? vehicleData : undefined,
          testimonialData: postType === 'testimonial_style' ? testimonialData : undefined,
          userProfile: userProfile
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate post')
      }

      if (!data.content) {
        throw new Error('No content received from AI')
      }

      setGeneratedContent(data.content)
      setEditedContent(data.content)
      
      // Scroll to preview
      setTimeout(() => {
        document.getElementById('preview-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
    } catch (err) {
      console.error('Generation error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate post'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!editedContent || !selectedGroup || !scheduledDate || !scheduledTime) {
      toast.warning('Please complete all required fields')
      return
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(scheduledTime)) {
      toast.warning('Invalid time format. Use HH:MM in 24-hour format (e.g., 09:00, 14:30)')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const group = groups.find(g => g.id === selectedGroup)
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`)

      const { error } = await supabase
        .from('post_schedules')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          scheduled_for: scheduledFor.toISOString(),
          post_type: postType,
          generated_content: editedContent,
          content_generated_at: new Date().toISOString(),
          status: 'content_ready',
          reminder_sent: false,
          target_audience: targetAudience || null,
          special_context: additionalContext || null,
          special_offer: postType === 'special_offer' ? specialOffer : null,
          vehicle_data: (postType === 'vehicle_spotlight' || postType === 'special_offer') ? vehicleData : null,
          testimonial_data: postType === 'testimonial_style' ? testimonialData : null
        })

      if (error) throw error

      toast.success('Post scheduled successfully! 🎉')
      router.push('/dashboard/posts')

    } catch (err) {
      console.error('Error scheduling post:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to schedule post'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedContent)
      setCopied(true)
      toast.success('Content copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy to clipboard')
    }
  }

  const openFacebookGroup = () => {
    if (selectedGroupData?.facebook_url) {
      window.open(selectedGroupData.facebook_url, '_blank')
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-8 h-8" />
          Schedule a Post
        </h1>
        <p className="mt-2 text-red-100">
          Create and schedule AI-generated content for your Facebook groups
        </p>
      </div>

      {/* Step 1: Select Group */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          Step 1: Select Facebook Group
        </h2>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
        >
          <option value="">Choose a group...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} - {group.territories?.name}
            </option>
          ))}
        </select>
        
        {selectedGroupData && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <strong>Territory:</strong> {selectedGroupData.territories?.name}
              </p>
              {selectedGroupData.group_type && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Type:</strong> {selectedGroupData.group_type}
                </p>
              )}
            </div>
            
            {selectedGroupData.facebook_url && (
              <button
                onClick={openFacebookGroup}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Facebook
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Post Type */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-red-600" />
          Step 2: Choose Post Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'vehicle_spotlight', label: 'Vehicle Spotlight', desc: 'Feature a specific car' },
            { value: 'special_offer', label: 'Special Offer', desc: 'Promote deals & discounts' },
            { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Build relationships' },
            { value: 'community', label: 'Community Focus', desc: 'Military community emphasis' },
            { value: 'testimonial_style', label: 'Success Story', desc: 'Customer testimonials' }
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

        {/* Vehicle Data Form */}
        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">🚗 Vehicle Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Make (e.g., Toyota)"
                value={vehicleData.make}
                onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Model (e.g., Camry)"
                value={vehicleData.model}
                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Year (e.g., 2020)"
                value={vehicleData.year}
                onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Price (e.g., $15,000)"
                value={vehicleData.price}
                onChange={(e) => setVehicleData({...vehicleData, price: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Mileage (e.g., 45,000 miles)"
                value={vehicleData.mileage}
                onChange={(e) => setVehicleData({...vehicleData, mileage: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Condition (e.g., Excellent)"
                value={vehicleData.condition}
                onChange={(e) => setVehicleData({...vehicleData, condition: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
            </div>
            <textarea
              placeholder="Key Features (e.g., leather seats, backup camera, low mileage...)"
              value={vehicleData.features}
              onChange={(e) => setVehicleData({...vehicleData, features: e.target.value})}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              rows={2}
            />
          </div>
        )}

        {/* Testimonial Data Form */}
        {postType === 'testimonial_style' && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">⭐ Customer Testimonial</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Customer Name (or 'Recent Customer')"
                value={testimonialData.customerName}
                onChange={(e) => setTestimonialData({...testimonialData, customerName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Vehicle Purchased (e.g., 2019 Honda Accord)"
                value={testimonialData.vehicle}
                onChange={(e) => setTestimonialData({...testimonialData, vehicle: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                placeholder="Location (e.g., Kaiserslautern)"
                value={testimonialData.location}
                onChange={(e) => setTestimonialData({...testimonialData, location: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <textarea
                placeholder="Their Experience (e.g., Great service, found perfect car, smooth process...)"
                value={testimonialData.experience}
                onChange={(e) => setTestimonialData({...testimonialData, experience: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Special Offer */}
        {postType === 'special_offer' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Offer Details
            </label>
            <textarea
              value={specialOffer}
              onChange={(e) => setSpecialOffer(e.target.value)}
              placeholder="e.g., 10% off for military, free extended warranty, special financing..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any other details: promotions, urgency, special circumstances..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Generate Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 3: Generate Content
        </h2>
        <button
          onClick={handleGenerateContent}
          disabled={generating || !selectedGroup}
          className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating AI Content...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Post with AI
            </>
          )}
        </button>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Step 4: Preview & Edit */}
      {editedContent && (
        <div id="preview-section" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Save className="w-6 h-6 text-red-600" />
            Step 4: Review & Edit Content
          </h2>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Your post content will appear here... or type your own!"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 font-sans"
            rows={12}
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <p className="text-sm text-gray-600">
              {editedContent.length} characters
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                disabled={!editedContent}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              
              {selectedGroupData?.facebook_url && (
                <button
                  onClick={openFacebookGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go to Facebook Group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Schedule */}
      {editedContent && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-red-600" />
            Step 5: When to Post
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={minDate}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: 09:00, 14:30, 18:45, 23:59
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You'll receive a reminder email 2 hours before the scheduled time. 
              You'll need to manually post the content to Facebook.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4 mt-6">
            <button
              onClick={handleSchedulePost}
              disabled={loading || !scheduledDate || !scheduledTime}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Schedule Post
                </>
              )}
            </button>

            {selectedGroupData?.facebook_url && (
              <button
                onClick={openFacebookGroup}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
              >
                <ExternalLink className="w-5 h-5" />
                Go to Facebook Group - Ready to Post!
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}