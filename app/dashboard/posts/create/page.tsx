// app/dashboard/posts/create/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Users, MapPin, Wand2, Save, Eye } from 'lucide-react'

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

export default function CreatePostPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{
    full_name: string
    email: string
    whatsapp?: string
  } | null>(null)
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState('')
  const [postType, setPostType] = useState<PostType>('brand_awareness')
  const [specialOffer, setSpecialOffer] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
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
  
  // Refs for form inputs
  const timeInputRef = useRef<HTMLInputElement>(null)
  
  // Preview mode
  const [showPreview, setShowPreview] = useState(false)

  // Debug: Log state changes
  useEffect(() => {
    console.log('State updated:', {
      scheduledDate,
      scheduledTime,
      editedContent: editedContent ? `${editedContent.substring(0, 50)}...` : 'empty',
      canSchedule: !!(scheduledDate && scheduledTime && editedContent)
    })
  }, [scheduledDate, scheduledTime, editedContent])

  useEffect(() => {
    loadGroups()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, whatsapp')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
      }

      const { data, error } = await supabase
        .from('facebook_groups')
        .select('*, territories(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const handleGeneratePost = async () => {
    if (!selectedGroup) {
      alert('Please select a Facebook group')
      return
    }

    setGenerating(true)
    setError(null)
    setShowPreview(false)
    
    try {
      const group = groups.find(g => g.id === selectedGroup)
      if (!group) throw new Error('Group not found')

      console.log('Generating post for:', group.name)

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
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        console.error('API Error Details:', data)
        throw new Error(data.details || data.error || 'Failed to generate post')
      }

      if (!data.content) {
        throw new Error('No content received from AI')
      }

      setGeneratedContent(data.content)
      setEditedContent(data.content)
      setShowPreview(true)
      
      // Scroll to preview
      setTimeout(() => {
        document.getElementById('preview-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate post'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleSavePost = async () => {
    // Get time from ref if state is empty
    const finalTime = scheduledTime || timeInputRef.current?.value || ''
    
    console.log('Attempting to save with:', {
      editedContent: !!editedContent,
      selectedGroup: !!selectedGroup,
      scheduledDate,
      scheduledTime,
      finalTime,
      timeRefValue: timeInputRef.current?.value
    })
    
    if (!editedContent || !selectedGroup || !scheduledDate || !finalTime) {
      alert('Please fill in all required fields (including time)')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const group = groups.find(g => g.id === selectedGroup)
      const scheduledFor = new Date(`${scheduledDate}T${finalTime}`)

      console.log('Saving post:', {
        user_id: user.id,
        group_id: selectedGroup,
        territory_id: group?.territory_id,
        scheduled_for: scheduledFor.toISOString(),
        content_length: editedContent.length
      })

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          generated_content: editedContent,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          is_ai_generated: true,
          post_type: postType,
          paid_by: 'none'
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Post saved successfully:', data)
      
      // Save as template if checkbox is checked
      if (saveAsTemplate) {
        const { error: templateError } = await supabase
          .from('templates')
          .insert({
            user_id: user.id,
            name: `${postType.replace('_', ' ')} - ${new Date().toLocaleDateString()}`,
            content: editedContent,
            post_type: postType,
            territory_id: group?.territory_id
          })
        
        if (templateError) {
          console.warn('Could not save template:', templateError)
        } else {
          console.log('Template saved successfully')
        }
      }
      
      alert('Post scheduled successfully! ✅' + (saveAsTemplate ? ' Template saved!' : ''))
      router.push('/dashboard/posts')
    } catch (error) {
      console.error('Error saving post:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to save post'
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
          <Sparkles className="w-8 h-8" />
          Create AI-Generated Post
        </h1>
        <p className="mt-2 text-red-100">
          Let AI create the perfect post for your Facebook group
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
          </div>
        )}
      </div>

      {/* Step 2: Post Type & Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 2: Choose Post Type & Enter Details
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

        {/* TYPE-SPECIFIC INPUTS START HERE */}
        
        {/* Special Offer Details */}
        {postType === 'special_offer' && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Offer Details *
            </label>
            <textarea
              value={specialOffer}
              onChange={(e) => setSpecialOffer(e.target.value)}
              placeholder="e.g., 10% off military pricing, free warranty upgrade, $500 trade-in bonus..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
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
                placeholder="Vehicle purchased *"
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

        {/* GENERAL CONTEXT - ALWAYS VISIBLE FOR ALL TYPES */}
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">📝 Additional Details (Optional but Recommended)</h3>
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

      {/* Generate Button */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error generating post:</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      <button
        onClick={handleGeneratePost}
        disabled={!selectedGroup || generating}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
      >
        <Sparkles className="w-6 h-6" />
        {generating ? 'Generating...' : 'Generate Post with AI'}
      </button>

      {/* Generated Content Preview/Edit */}
      {showPreview && generatedContent && (
        <div id="preview-section">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-red-600" />
              Step 3: Review & Edit
            </h2>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-sans"
              rows={12}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-gray-600">
                {editedContent.length} characters • Feel free to edit the generated content
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Save as Template</span>
              </label>
            </div>
          </div>

          {/* Step 4: Schedule */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" />
              Step 4: Schedule Post
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => {
                    console.log('Date changed:', e.target.value)
                    setScheduledDate(e.target.value)
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  ref={timeInputRef}
                  type="time"
                  defaultValue=""
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement
                    const newTime = target.value
                    console.log('Time input event:', newTime)
                    setScheduledTime(newTime)
                  }}
                  onChange={(e) => {
                    const newTime = e.target.value
                    console.log('Time onChange:', newTime)
                    setScheduledTime(newTime)
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePost}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            <Save className="w-6 h-6" />
            {loading ? 'Saving...' : 'Schedule Post'}
          </button>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500 text-center">
            Date: {scheduledDate || 'Not set'} | Time: {scheduledTime || 'Not set'} | Content: {editedContent ? 'Yes' : 'No'}
          </div>
        </div>
      )}
    </div>
  )
}