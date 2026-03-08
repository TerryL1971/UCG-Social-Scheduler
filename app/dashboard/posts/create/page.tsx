// app/dashboard/posts/create/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Users, MapPin, Wand2, Save, Eye, Copy, FileText, Image, Video, ExternalLink } from 'lucide-react'
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
  const [postType, setPostType] = useState<PostType>('vehicle_spotlight')
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
  
  // Media uploads
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaNote, setMediaNote] = useState('')
  
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
        .select('id, name, territory_id, group_type, description, facebook_url, territories(name)')
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

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isUnder50MB = file.size <= 50 * 1024 * 1024
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Only images and videos are allowed`)
        return false
      }
      if (!isUnder50MB) {
        toast.error(`${file.name}: File must be under 50MB`)
        return false
      }
      return true
    })
    
    setMediaFiles(prev => [...prev, ...validFiles])
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleGeneratePost = async () => {
    if (!selectedGroup) {
      toast.warning('Please select a Facebook group')
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
          userProfile: userProfile,
          mediaNote: mediaFiles.length > 0 ? mediaNote || `Note: ${mediaFiles.length} photo(s)/video(s) will be attached` : undefined
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
      toast.success('Content copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy to clipboard')
    }
  }

  const openFacebookGroup = () => {
    const group = groups.find(g => g.id === selectedGroup)
    if (group?.facebook_url) {
      window.open(group.facebook_url, '_blank')
    } else {
      toast.warning('No Facebook URL set for this group')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!editedContent) {
      toast.warning('Please generate or enter content first')
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
      
      toast.success('Template saved successfully!')
    } catch (err) {
      console.error('Error saving template:', err)
      toast.error('Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const handleSchedulePost = async () => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!editedContent || !selectedGroup || !scheduledDate || !scheduledTime) {
      toast.warning('Please fill in all required fields (content, group, date, and time)')
      return
    }
    
    if (!timeRegex.test(scheduledTime)) {
      toast.warning('Invalid time format. Please use HH:MM in 24-hour format (e.g., 14:30, 09:00, 23:45)')
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
        post_type: postType,
        has_media: mediaFiles.length > 0
      })

      // TODO: Upload media files to storage and get URLs
      // For now, just add a note about media in the content
      let finalContent = editedContent
      if (mediaFiles.length > 0) {
        finalContent += `\n\n📎 ${mediaFiles.length} media file(s) attached`
      }

      const { data: postData, error: saveError } = await supabase
        .from('post_schedules')
        .insert({
          user_id: user.id,
          group_id: selectedGroup,
          territory_id: group?.territory_id,
          generated_content: finalContent,
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
      
      toast.success('Post scheduled successfully!')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('❌ Error saving post:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to save post'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Create Post
        </h1>
        <p className="mt-2 text-red-100">
          Generate AI content or write your own - copy, schedule, or save as template
        </p>
      </div>

      {/* Step 1: Select Group */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          Step 1: Select Facebook Group
        </h2>
        <div className="space-y-3">
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
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <strong>Territory:</strong> {selectedGroupData.territories?.name}
                </p>
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
      </div>

      {/* Step 2: Post Type & Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 2: Choose Post Type & Enter Details (Optional - for AI Generation)
        </h2>
        
        {/* Post Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            { value: 'vehicle_spotlight', label: 'Vehicle Spotlight', desc: 'Highlight specific vehicles' },
            { value: 'special_offer', label: 'Special Offer', desc: 'Promote a specific deal' },
            { value: 'brand_awareness', label: 'Brand Awareness', desc: 'Community-focused, relationship building' },
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              rows={2}
            />
          </div>
        )}

        {/* Vehicle Information */}
        {(postType === 'vehicle_spotlight' || postType === 'special_offer') && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-gray-900 mb-4">🚗 Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Media Upload Section */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            📸 Add Photos or Videos (Optional)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload photos or videos to include with your post. You'll attach these when posting to Facebook.
          </p>
          
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                file:cursor-pointer cursor-pointer"
            />
            
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {mediaFiles.length} file(s) selected:
                </p>
                {mediaFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Video className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeMedia(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <input
                  type="text"
                  value={mediaNote}
                  onChange={(e) => setMediaNote(e.target.value)}
                  placeholder="Optional: Note about the photos/videos for AI context..."
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Additional Context */}
        <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
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
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
      >
        {generating ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            Generating with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate Post with AI
          </>
        )}
      </button>

      {/* Content Editor */}
      <div id="preview-section" className="bg-white rounded-lg shadow-sm p-6">
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-sans"
          rows={12}
        />
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-sm text-gray-600">
            {editedContent.length} characters
            {mediaFiles.length > 0 && ` • ${mediaFiles.length} media file(s)`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              disabled={!editedContent}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Schedule & Actions */}
      {editedContent && (
        <>
          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" />
              Step 4: Schedule Post (Optional)
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent font-mono text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: 09:00, 14:30, 18:45, 23:59
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleSaveAsTemplate}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Save as Template
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={loading || !scheduledDate || !scheduledTime}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
          </div>
        </>
      )}
    </div>
  )
}