// app/dashboard/posts/[id]/edit/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Group = {
  id: string
  name: string
  territory_id: string | null
  territories: {
    name: string
  } | null
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [scheduledFor, setScheduledFor] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userTerritories, setUserTerritories] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPostAndGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPostAndGroups = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch the post
      const { data: postData } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          facebook_groups (
            id,
            name,
            territory_id,
            territories(name)
          )
        `)
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (!postData) {
        alert('Post not found or you do not have permission to edit it')
        router.push('/dashboard/my-violations')
        return
      }

      setContent(postData.generated_content || '')
      setScheduledFor(postData.scheduled_for ? new Date(postData.scheduled_for).toISOString().slice(0, 16) : '')
      
      const currentGroup = Array.isArray(postData.facebook_groups) 
        ? postData.facebook_groups[0] 
        : postData.facebook_groups
      
      setSelectedGroupId(currentGroup?.id || '')

      // Fetch user's territories
      const { data: profileTerritories } = await supabase
        .from('profile_territories')
        .select('territory_id')
        .eq('profile_id', user.id)

      const territoryIds = (profileTerritories || []).map(pt => pt.territory_id)
      setUserTerritories(territoryIds)

      // Fetch all user's groups
      const { data: groupsData } = await supabase
        .from('facebook_groups')
        .select(`
          id,
          name,
          territory_id,
          territories(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      setGroups((groupsData || []).map(g => ({
        ...g,
        territories: Array.isArray(g.territories) ? g.territories[0] : g.territories
      })) as Group[])

    } catch (err) {
      console.error('Error fetching post:', err)
      alert('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedGroupId || !content.trim() || !scheduledFor) {
      alert('Please fill in all fields')
      return
    }

    setSaving(true)
    try {
      const selectedGroup = groups.find(g => g.id === selectedGroupId)
      const isViolation = selectedGroup?.territory_id 
        ? !userTerritories.includes(selectedGroup.territory_id)
        : false

      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          group_id: selectedGroupId,
          generated_content: content,
          scheduled_for: scheduledFor,
          territory_violation_acknowledged: isViolation,
          violation_status: isViolation ? 'unresolved' : null
        })
        .eq('id', resolvedParams.id)

      if (error) throw error

      alert('Post updated successfully!')
      router.push('/dashboard/my-violations')
    } catch (err) {
      console.error('Error updating post:', err)
      alert('Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  const isGroupInTerritory = (group: Group) => {
    if (!group.territory_id) return true
    return userTerritories.includes(group.territory_id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/my-violations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Violations
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Edit Post</h1>
          <p className="text-gray-600 mt-1">Update your post and resolve territory violations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook Group *
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a group...</option>
              {groups.map(group => {
                const inTerritory = isGroupInTerritory(group)
                return (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.territories && ` (${group.territories.name})`}
                    {!inTerritory && ' ⚠️ Outside Territory'}
                  </option>
                )
              })}
            </select>
            {selectedGroupId && !isGroupInTerritory(groups.find(g => g.id === selectedGroupId)!) && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded flex items-start">
                <AlertTriangle className="w-4 h-4 text-orange-600 mr-2 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-800">
                  Warning: This group is outside your assigned territories. This will still be marked as a violation.
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Content *
            </label>
            <textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your post content..."
            />
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled For *
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledFor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Link href="/dashboard/my-violations">
              <Button variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedGroupId || !content.trim() || !scheduledFor}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}