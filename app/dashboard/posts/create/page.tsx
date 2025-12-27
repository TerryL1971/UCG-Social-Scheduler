// app/dashboard/posts/create/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { getApprovedTerritoriesWithDetails } from '@/lib/territoryHelpers'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2, MapPin, AlertCircle } from 'lucide-react'

type Territory = {
  id: string
  name: string
}

type FacebookGroup = {
  id: string
  name: string
  territory_id: string | null
}

type Profile = {
  role: string
  dealership_id: string | null
}

export default function CreatePostPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [territories, setTerritories] = useState<Territory[]>([])
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user profile to get role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, dealership_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch territories based on role
      if (profileData.role === 'salesperson') {
        // For salespeople, only get approved territories
        const approvedTerritories = await getApprovedTerritoriesWithDetails()
        setTerritories(approvedTerritories)
      } else {
        // For managers/admins, get all territories
        const { data: allTerritories, error: territoriesError } = await supabase
          .from('territories')
          .select('id, name')
          .order('name')

        if (territoriesError) throw territoriesError
        setTerritories(allTerritories || [])
      }

      // Fetch groups (will be filtered by territory selection)
      const { data: groupsData, error: groupsError } = await supabase
        .from('facebook_groups')
        .select('id, name, territory_id')
        .order('name')

      if (groupsError) throw groupsError
      setGroups(groupsData || [])

    } catch (err) {
      console.error('Error fetching data:', err)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const generateContent = async () => {
    if (!selectedGroupId) {
      alert('Please select a group')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          context: 'social media post'
        })
      })

      const data = await response.json()
      if (data.content) {
        setContent(data.content)
      }
    } catch (err) {
      console.error('Error generating content:', err)
      alert('Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedGroupId || !scheduledDate || !scheduledTime || !content) {
      alert('Please fill in all fields')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)

      const { error } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          group_id: selectedGroupId,
          generated_content: content,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending'
        })

      if (error) throw error

      alert('Post scheduled successfully!')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('Error creating post:', err)
      alert('Failed to schedule post')
    }
  }

  // Filter groups based on available territories
  const availableTerritoryIds = territories.map(t => t.id)
  const filteredGroups = groups.filter(group => 
    group.territory_id && availableTerritoryIds.includes(group.territory_id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-1">Schedule a post for your Facebook groups</p>
      </div>

      {/* Show warning if salesperson has no territory access */}
      {profile?.role === 'salesperson' && territories.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  No Territory Access
                </h3>
                <p className="text-sm text-yellow-800">
                  You don&apos;t have access to any territories yet. Please request territory 
                  access from your manager in the{' '}
                  <a href="/dashboard/territories" className="underline font-medium">
                    Territory Management
                  </a>{' '}
                  section to create posts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show territory info for salespeople */}
      {profile?.role === 'salesperson' && territories.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-900">
                <strong>Your Approved Territories:</strong>{' '}
                {territories.map(t => t.name).join(', ')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Group *
                {profile?.role === 'salesperson' && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Only groups in your approved territories)
                  </span>
                )}
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Select a group...</option>
                {filteredGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {filteredGroups.length === 0 && territories.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No groups available in your territories. Contact your manager to add groups.
                </p>
              )}
            </div>

            {/* Scheduled Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time *
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Post Content *
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateContent}
                  disabled={!selectedGroupId || generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate with AI'
                  )}
                </Button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content or generate it with AI..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={territories.length === 0}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              height: '2.25rem',
              padding: '0.5rem 1rem',
              border: 'none',
              cursor: territories.length === 0 ? 'not-allowed' : 'pointer',
              opacity: territories.length === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (territories.length > 0) {
                e.currentTarget.style.backgroundColor = '#b91c1c'
              }
            }}
            onMouseLeave={(e) => {
              if (territories.length > 0) {
                e.currentTarget.style.backgroundColor = '#dc2626'
              }
            }}
          >
            <Calendar className="w-4 h-4" />
            Schedule Post
          </button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/posts')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}