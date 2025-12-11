'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Globe, Trash2, CheckCircle, XCircle } from 'lucide-react'

type Territory = {
  id: string
  name: string
}

type FacebookGroup = {
  id: string
  name: string
  facebook_url: string | null
  description: string | null
  member_count: number | null
  territory_id: string | null
  territories?: Territory
  posting_rules: {
    max_posts_per_week?: number
    best_time?: string
    notes?: string
  }
  is_active: boolean
  created_at: string
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    facebook_url: '',
    description: '',
    member_count: '',
    territory_id: '',
    max_posts_per_week: '',
    best_time: '',
    notes: '',
  })

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage('')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Current user ID:', user?.id)
      
      if (!user) {
        console.log('No user found')
        setErrorMessage('Not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('facebook_groups')
        .select('*, territories(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('Groups query result:', { data, error, userID: user.id })

      if (error) {
        console.error('Error fetching groups:', error)
        setErrorMessage(`Error: ${error.message || 'Unable to fetch groups'}`)
      } else {
        setGroups(data || [])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setErrorMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTerritories = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()

      if (profile?.dealership_id) {
        const { data } = await supabase
          .from('territories')
          .select('id, name')
          .eq('dealership_id', profile.dealership_id)
          .order('name')

        setTerritories(data || [])
      }
    } catch (err) {
      console.error('Error fetching territories:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (mounted) {
        await fetchGroups()
        await fetchTerritories()
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [fetchGroups, fetchTerritories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const postingRules = {
        max_posts_per_week: formData.max_posts_per_week ? parseInt(formData.max_posts_per_week) : undefined,
        best_time: formData.best_time || undefined,
        notes: formData.notes || undefined,
      }

      console.log('Inserting group with user_id:', user.id)

      const { data, error } = await supabase.from('facebook_groups').insert({
        user_id: user.id,
        name: formData.name,
        facebook_url: formData.facebook_url || null,
        description: formData.description || null,
        member_count: formData.member_count ? parseInt(formData.member_count) : null,
        territory_id: formData.territory_id || null,
        posting_rules: postingRules,
        is_active: true,
      }).select()

      console.log('Insert result:', { data, error })

      if (error) {
        console.error('Error adding group:', error)
        alert('Failed to add group: ' + (error.message || 'Unknown error'))
      } else {
        setShowAddForm(false)
        setFormData({
          name: '',
          facebook_url: '',
          description: '',
          member_count: '',
          territory_id: '',
          max_posts_per_week: '',
          best_time: '',
          notes: '',
        })
        await fetchGroups()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const toggleGroupStatus = async (groupId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('facebook_groups')
        .update({ is_active: !currentStatus })
        .eq('id', groupId)

      if (error) {
        console.error('Error updating group:', error)
        alert('Failed to update group')
      } else {
        await fetchGroups()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('facebook_groups')
        .delete()
        .eq('id', groupId)

      if (error) {
        console.error('Error deleting group:', error)
        alert('Failed to delete group')
      } else {
        await fetchGroups()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facebook Groups</h1>
            <p className="text-gray-600 mt-1">Manage the groups you post to</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Loading groups...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facebook Groups</h1>
          <p className="text-gray-600 mt-1">Manage the groups you post to</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-800">{errorMessage}</p>
            <p className="text-sm text-red-600 mt-2">
              Check the browser console for more details (F12 or Cmd+Option+I)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Group Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Group</CardTitle>
            <CardDescription>Enter the details of the Facebook group</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Phoenix Car Buyers"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Facebook URL</label>
                  <Input
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/groups/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the group"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member Count</label>
                  <Input
                    type="number"
                    value={formData.member_count}
                    onChange={(e) => setFormData({ ...formData, member_count: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Territory</label>
                  <select
                    value={formData.territory_id}
                    onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select territory (optional)</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Posting Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Posts Per Week</label>
                    <Input
                      type="number"
                      value={formData.max_posts_per_week}
                      onChange={(e) => setFormData({ ...formData, max_posts_per_week: e.target.value })}
                      placeholder="e.g., 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Best Time to Post</label>
                    <Input
                      value={formData.best_time}
                      onChange={(e) => setFormData({ ...formData, best_time: e.target.value })}
                      placeholder="e.g., Evenings, Weekends"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium">Additional Notes</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special rules or guidelines"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit">Add Group</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first Facebook group to start scheduling posts
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                    )}

                    <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                      {group.member_count && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {group.member_count.toLocaleString()} members
                        </div>
                      )}
                      {group.territories && (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          {group.territories.name}
                        </div>
                      )}
                    </div>

                    {group.posting_rules && Object.keys(group.posting_rules).length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-1">Posting Rules</p>
                        <div className="text-sm text-blue-700 space-y-1">
                          {group.posting_rules.max_posts_per_week && (
                            <p>• Max {group.posting_rules.max_posts_per_week} posts per week</p>
                          )}
                          {group.posting_rules.best_time && (
                            <p>• Best time: {group.posting_rules.best_time}</p>
                          )}
                          {group.posting_rules.notes && (
                            <p>• {group.posting_rules.notes}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupStatus(group.id, group.is_active)}
                    >
                      {group.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}