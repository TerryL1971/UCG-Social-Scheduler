// app/dashboard/posts/schedule/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Calendar, Users, Loader2 } from 'lucide-react'

export default function CreatePostPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [occasion, setOccasion] = useState('')
  const [generatedPost, setGeneratedPost] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's territories
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('facebook_groups')
      .select('*, territories(name)')
      .eq('active', true)

    // If salesperson, filter by their territories
    if (profile?.role === 'salesperson') {
      const { data: userTerritories } = await supabase
        .from('profile_territories')
        .select('territory_id')
        .eq('profile_id', user.id)

      if (userTerritories && userTerritories.length > 0) {
        const territoryIds = userTerritories.map(t => t.territory_id)
        query = query.in('territory_id', territoryIds)
      }
    }

    const { data } = await query
    setGroups(data || [])
    setLoading(false)
  }

  const generatePost = async () => {
    if (!selectedGroup) {
      alert('Please select a Facebook group')
      return
    }

    setIsGenerating(true)
    setGeneratedPost('')

    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup,
          occasion: occasion || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedPost(data.content)
      } else {
        alert(data.error || 'Failed to generate post')
      }
    } catch (error) {
      alert('Error generating post')
    } finally {
      setIsGenerating(false)
    }
  }

  const schedulePost = async () => {
    if (!generatedPost || !selectedGroup || !scheduledDate || !scheduledTime) {
      alert('Please fill in all fields')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)

    const { error } = await supabase
      .from('scheduled_posts')
      .insert({
        profile_id: user.id,
        group_id: selectedGroup,
        content: generatedPost,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending'
      })

    if (error) {
      alert('Error scheduling post')
    } else {
      alert('Post scheduled successfully!')
      router.push('/dashboard/posts')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-2">Generate AI-powered posts for your Facebook groups</p>
      </div>

      {/* Step 1: Select Group */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold">Select Facebook Group</h2>
        </div>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="">Choose a group...</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name} - {group.territories?.name || 'No territory'}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Optional Occasion */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Occasion or Theme (Optional)</h2>
        <input
          type="text"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="e.g., Memorial Day, New Inventory Sale, Tax Season..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePost}
        disabled={!selectedGroup || isGenerating}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Post with AI
          </>
        )}
      </button>

      {/* Generated Post Preview & Edit */}
      {generatedPost && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Generated Post</h2>
            <textarea
              value={generatedPost}
              onChange={(e) => setGeneratedPost(e.target.value)}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-sans"
              placeholder="Your generated post will appear here..."
            />
            <p className="text-sm text-gray-500 mt-2">
              You can edit the generated post before scheduling
            </p>
          </div>

          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold">Schedule Post</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={schedulePost}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Schedule Post
            </button>
            <button
              onClick={() => router.push('/dashboard/posts')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}