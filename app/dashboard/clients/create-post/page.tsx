// app/dashboard/clients/create-post/page.tsx

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, Calendar, Wand2, Eye, Copy, 
  FileText, Building2, ChevronRight, X
} from 'lucide-react'
import { toast } from 'sonner'

type Tone = 'professional' | 'friendly' | 'fun' | 'informative'

type Client = {
  id: string
  business_name: string
  description: string
  industry: string | null
  website_url: string | null
  facebook_handle: string | null
  instagram_handle: string | null
  tone: Tone
  logo_url: string | null
  partnership_notes: string | null
}

type EmojiLevel = 'none' | 'few' | 'moderate' | 'lots'
type PostTopic = 'general_spotlight' | 'special_event' | 'seasonal' | 'partnership'
type ScheduleType = 'one_time' | 'daily' | 'weekly' | 'monthly'

const EMOJI_OPTIONS: { value: EmojiLevel; label: string; example: string }[] = [
  { value: 'none', label: 'No Emojis', example: 'Clean text only' },
  { value: 'few', label: 'A Few', example: '1-2 emojis' },
  { value: 'moderate', label: 'Moderate', example: '3-5 emojis' },
  { value: 'lots', label: 'Lots', example: '6+ emojis' },
]

const TOPIC_OPTIONS: { value: PostTopic; label: string; desc: string }[] = [
  { value: 'general_spotlight', label: 'General Spotlight', desc: 'Introduce and promote the business' },
  { value: 'special_event', label: 'Special Event', desc: 'Wine tasting, sale, opening, etc.' },
  { value: 'seasonal', label: 'Seasonal', desc: 'Holiday, season, or time-based content' },
  { value: 'partnership', label: 'UCG Partnership', desc: 'Highlight the UCG connection' },
]

export default function CreateClientPostPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Post options
  const [postTopic, setPostTopic] = useState<PostTopic>('general_spotlight')
  const [eventDetails, setEventDetails] = useState('')
  const [wordCount, setWordCount] = useState(150)
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>('few')
  const [additionalContext, setAdditionalContext] = useState('')

  // Generated content
  const [generatedContent, setGeneratedContent] = useState('')
  const [editedContent, setEditedContent] = useState('')

  // Scheduling
  const [scheduleType, setScheduleType] = useState<ScheduleType>('one_time')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [minDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('is_active', true)
          .order('business_name')
        if (error) throw error
        setClients(data || [])
      } catch (err) {
        console.error('Error fetching clients:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [supabase])

  const handleGeneratePost = async () => {
    if (!selectedClient) {
      toast.warning('Please select a client first')
      return
    }

    if (postTopic === 'special_event' && !eventDetails.trim()) {
      toast.warning('Please describe the special event')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/clients/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          businessName: selectedClient.business_name,
          description: selectedClient.description,
          industry: selectedClient.industry,
          tone: selectedClient.tone,
          websiteUrl: selectedClient.website_url,
          facebookHandle: selectedClient.facebook_handle,
          partnershipNotes: selectedClient.partnership_notes,
          postTopic,
          eventDetails,
          wordCount,
          emojiLevel,
          additionalContext,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.details || data.error || 'Failed to generate post')

      const content = data.content || ''
      setGeneratedContent(content)
      setEditedContent(content)

      setTimeout(() => {
        document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate post'
      setError(msg)
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!editedContent || !selectedClient) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const templateName = prompt(`Enter a name for this template:`, `${selectedClient.business_name} - ${postTopic}`)
      if (!templateName) { setSaving(false); return }

      const { error } = await supabase.from('templates').insert({
        user_id: user.id,
        name: templateName,
        content: editedContent,
        post_type: 'client_spotlight',
      })
      if (error) throw error
      toast.success('Template saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!editedContent || !selectedClient || !scheduledDate || !scheduledTime) {
      toast.warning('Please fill in all required fields (content, date, and time)')
      return
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(scheduledTime)) {
      toast.warning('Invalid time format. Use HH:MM (e.g. 14:30)')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`)

      const { error } = await supabase.from('post_schedules').insert({
        user_id: user.id,
        generated_content: editedContent,
        scheduled_for: scheduledFor.toISOString(),
        status: 'content_ready',
        reminder_sent: false,
        content_generated_at: new Date().toISOString(),
        post_type: 'client_spotlight',
        is_recurring: scheduleType !== 'one_time',
        recurring_frequency: scheduleType !== 'one_time' ? scheduleType : null,
      })

      if (error) throw error

      toast.success('Post scheduled successfully!')
      router.push('/dashboard/posts')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule post'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Create Client Post
        </h1>
        <p className="mt-2 text-red-100">
          Generate AI-powered spotlight posts for your partner businesses
        </p>
      </div>

      {/* Step 1: Select Client */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-red-600" />
          Step 1: Select Partner
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No active clients yet.</p>
            <button
              onClick={() => router.push('/dashboard/clients')}
              className="ucg-btn-primary"
            >
              Add a Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  selectedClient?.id === client.id
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={client.business_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{client.business_name}</p>
                  <p className="text-xs text-gray-500 truncate">{client.industry || 'General Business'}</p>
                </div>
                {selectedClient?.id === client.id && (
                  <ChevronRight className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {selectedClient && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 line-clamp-3">{selectedClient.description}</p>
            {selectedClient.partnership_notes && (
              <p className="text-xs text-red-600 mt-2 font-medium">🤝 {selectedClient.partnership_notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Post Options */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-red-600" />
          Step 2: Post Options
        </h2>

        {/* Topic */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Post Topic</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic.value}
                onClick={() => setPostTopic(topic.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  postTopic === topic.value
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <p className="font-semibold text-sm text-gray-900">{topic.label}</p>
                <p className="text-xs text-gray-500">{topic.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Special Event Details */}
        {postTopic === 'special_event' && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={eventDetails}
              onChange={(e) => setEventDetails(e.target.value)}
              placeholder="e.g., Annual wine tasting event on Saturday June 15th, featuring 20+ local wines, live music, and food pairings. Tickets €25."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 resize-none"
            />
          </div>
        )}

        {/* Word Count */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Word Count: <span className="text-red-600 font-bold">{wordCount} words</span>
          </label>
          <input
            type="range"
            min={50}
            max={500}
            step={25}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="w-full accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50 (Short)</span>
            <span>150 (Medium)</span>
            <span>300 (Long)</span>
            <span>500 (Detailed)</span>
          </div>
        </div>

        {/* Emoji Level */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Emoji Level</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEmojiLevel(opt.value)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  emojiLevel === opt.value
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.example}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any extra details, promotions, talking points, or specific messaging you want included..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 resize-none"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGeneratePost}
        disabled={!selectedClient || generating}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
      >
        {generating ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
            Generating with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate Post with AI
          </>
        )}
      </button>

      {/* Step 3: Content Editor */}
      <div id="preview-section" className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-6 h-6 text-red-600" />
          Step 3: Post Content
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Edit the generated content or write your own
        </p>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder="Your post content will appear here after generating..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 font-sans"
          rows={12}
        />
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-sm text-gray-500">{editedContent.length} characters</p>
          <button
            onClick={handleCopy}
            disabled={!editedContent}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      {/* Step 4: Schedule */}
      {editedContent && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" />
              Step 4: Schedule Post
            </h2>

            {/* Schedule Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'one_time', label: 'One Time' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScheduleType(opt.value as ScheduleType)}
                    className={`p-3 rounded-lg border-2 text-center font-medium text-sm transition-all ${
                      scheduleType === opt.value
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {scheduleType === 'one_time' ? 'Date' : 'Start Date'}
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
                  Time (24-hour format)
                </label>
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d:]/g, '')
                    if (value.length === 4 && !value.includes(':')) {
                      value = value.substring(0, 2) + ':' + value.substring(2)
                    }
                    if (value.length <= 5) setScheduledTime(value)
                  }}
                  placeholder="14:30"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 font-mono text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">e.g. 09:00, 14:30, 18:45</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            <button
              onClick={handleSaveAsTemplate}
              disabled={saving || !editedContent}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Save as Template
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={saving || !scheduledDate || !scheduledTime}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
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