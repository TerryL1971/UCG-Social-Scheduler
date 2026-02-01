// app/dashboard/posts/create/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Users, MapPin, Wand2, Save, Eye, Copy, FileText } from 'lucide-react'

type FacebookGroup = {
  id: string
  name: string
  territory_id: string
  group_type?: string
  description?: string
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

type UserProfile = {
  full_name: string
  email: string
  whatsapp?: string
}

export default function CreatePostPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [specialOffer, setSpecialOffer] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  
  // Vehicle data
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    make: '',
    model: '',
    year: '',
    price: '',
    features: '',
    condition: 'excellent',
    mileage: ''
  })
  
  // Testimonial data
  const [testimonialData, setTestimonialData] = useState<TestimonialData>({
    customerName: '',
    vehicle: '',
    experience: '',
    location: ''
  })
  
  const [generatedContent, setGeneratedContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  
  // Preview mode
  const [copied, setCopied] = useState(false)
  const [minDate, setMinDate] = useState('')

  useEffect(() => {
    loadGroups()
    setMinDate(new Date().toISOString().split('T')[0])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found')
        return
      }

      console.log('Loading groups for user:', user.id)

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, whatsapp')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        console.log('User profile loaded:', profile)
      }

      const { data, error: groupsError } = await supabase
        .from('facebook_groups')
        .select('id, name, territory_id, group_type, description, territories(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      console.log('Groups query result:', { data, error: groupsError })

      if (groupsError) {
        console.error('Groups query error:', groupsError)
        throw groupsError
      }

      // Flatten the territories relationship
      const flattenedData = data?.map(group => ({
        ...group,
        territories: Array.isArray(group.territories) ? group.territories[0] : group.territories
      })) || []

      console.log('Flattened groups:', flattenedData)
      setGroups(flattenedData || [])
    } catch (err) {
      console.error('Error loading groups:', err)
    }
  }

  const handleGeneratePost = async () => {
    if (!selectedGroup) {
      alert('Please select a Facebook group')
      return
    }

    setGenerating(true)
    setError(null)
    
    try {
      const group = groups.find(g => g.id === selectedGroup)
      if (!group) throw new Error('Group not found')

      console.log('Generating post for:', group.name)
      console.log('Territory:', group.territories?.name)

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
      console.log('API Response:', data)
      
      if (!response.ok) {
        console.error('API Error Details:', data)
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
      alert(errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!editedContent) {
      alert('Please generate or enter content first')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const group = groups.find(g => g.id === selectedGroup)
      
      const templateName = prompt('Enter a name for this template:')
      if (!templateName) {
        setLoading(false)
        return
      }

      const { error: templateError } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: templateName,
          content: editedContent,
          post_type: postType,
          territory_id: group?.territory_id
        })
      
      if (templateError) throw templateError
      
      alert('Template saved successfully! ✅')
    } catch (err) {
      console.error('Error saving template:', err)
      alert('Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const handleSchedulePost = async () => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!editedContent || !selectedGroup || !scheduledDate || !scheduledTime) {
      alert('Please fill in all required fields (content, group, date, and time)')
      return
    }
    
    if (!timeRegex.test(scheduledTime)) {
      alert('Invalid time format. Please use HH:MM in 24-hour format (e.g., 14:30, 09:00, 23:45)')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated. Please log in again.')

      const group = groups.find(g => g.id === selectedGroup)
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`)

      console.log('💾 Attempting to save post:', {
        user_id: user.id,
        group_id: selectedGroup,
        group_name: group?.name,
        territory_id: group?.territory_id,
        scheduled_for: scheduledFor.toISOString(),
        content_length: editedContent.length,
        post_type: postType
      })

      const { data: postData, error: saveError } = await supabase
        .from('post_schedules')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          generated_content: editedContent,
          scheduled_for: scheduledFor.toISOString(),
          status: 'content_ready',
          reminder_sent: false,
          content_generated_at: new Date().toISOString(),
          post_type: postType,
          is_recurring: false
        })
        .select()

      console.log('💾 Save response:', { data: postData, error: saveError })

      if (saveError) {
        console.error('❌ Supabase save error:', saveError)
        throw saveError
      }

      if (!postData || postData.length === 0) {
        console.error('❌ No data returned from insert')
        throw new Error('Post was not saved - no data returned')
      }

      console.log('✅ Post saved successfully:', postData)
      
      alert('Post scheduled successfully! ✅')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('❌ Error saving post:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to save post'
      setError(errorMsg)
      alert('Error: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-4 sm:space-y-6 px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-4 sm:p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl md:text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Create Post
        </h1>
        <p className="mt-2 text-red-100">
          Generate AI content or write your own - copy, schedule, or save as template
        </p>
      </div>

      {/* Step 1: Select Group */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          Step 1: Select Facebook Group
        </h2>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full px-4 py-3 min-h-[44px]border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
          </div>
        )}
      </div>

      {/* Step 2: Post Type & Details */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 2: Choose Post Type & Enter Details (Optional - for AI Generation)
        </h2>
        
        {/* Post Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 sm:mb-6">
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
              className="w-full px-4 py-3 min-h-[44px]border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              rows={2}
            />
          </div>
        )}

        {/* Vehicle Information */}
        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 mb-4">🚗 Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 sm:gap-4">
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
            <textarea
              value={vehicleData.features}
              onChange={(e) => setVehicleData({...vehicleData, features: e.target.value})}
              placeholder="Key features (e.g., Navigation, heated seats, AWD...)"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600 mt-4"
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="text"
                value={testimonialData.vehicle}
                onChange={(e) => setTestimonialData({...testimonialData, vehicle: e.target.value})}
                placeholder="Vehicle purchased"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <textarea
                value={testimonialData.experience}
                onChange={(e) => setTestimonialData({...testimonialData, experience: e.target.value})}
                placeholder="Their experience/need..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-600"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Additional Context */}
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">📝 Additional Details (Optional)</h3>
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
                Additional Context
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any other details: promotions, urgency, special circumstances..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">💡 More context helps AI create better posts!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGeneratePost}
        disabled={!selectedGroup || generating}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 min-h-[44px] px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base sm:text-lg"
      >
        <Sparkles className="w-6 h-6" />
        {generating ? 'Generating...' : 'Generate Post with AI'}
      </button>

      {/* Content Editor - Always visible or after generation */}
      <div id="preview-section" className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-6 h-6 text-red-600" />
          Step 3: Post Content
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Generate AI content above, or paste/write your own post here
        </p>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder="Your post content will appear here... or type your own!"
          className="w-full px-4 py-3 min-h-[44px]border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-sans"
          rows={12}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-600">
            {editedContent.length} characters
          </p>
          <button
            onClick={handleCopyToClipboard}
            disabled={!editedContent}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      {editedContent && (
        <>
          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" />
              Step 4: Schedule Post (Optional)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-3 min-h-[44px]border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-mono text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: 09:00, 14:30, 18:45, 23:59
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 sm:gap-4">
            <button
              onClick={handleSaveAsTemplate}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 min-h-[44px] px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Save as Template
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={loading || !scheduledDate || !scheduledTime}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 min-h-[44px] px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Calendar className="w-5 h-5" />
              {loading ? 'Scheduling...' : 'Schedule Post'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}