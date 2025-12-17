// app/dashboard/territories/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Users, Building2, Edit, Save, X } from 'lucide-react'

interface Territory {
  id: string
  name: string
  dealership_id: string
  cities: string[]
  zip_codes: string[]
  dealerships: {
    name: string
    location: string
  }
}

interface FacebookGroup {
  id: string
  name: string
  territory_id: string | null
  territories: {
    name: string
  } | null
}

interface Profile {
  id: string
  full_name: string
  email: string
  territory_ids: string[]
  dealership_id: string
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [territoriesRes, groupsRes, profilesRes] = await Promise.all([
      supabase
        .from('territories')
        .select('*, dealerships(name, location)')
        .order('name'),
      supabase
        .from('facebook_groups')
        .select('id, name, territory_id, territories(name)')
        .order('name'),
      supabase
        .from('profiles')
        .select('id, full_name, email, territory_ids, dealership_id')
        .order('full_name')
    ])

    if (territoriesRes.data) setTerritories(territoriesRes.data as unknown as Territory[])
    if (groupsRes.data) setGroups(groupsRes.data as unknown as FacebookGroup[])
    if (profilesRes.data) setProfiles(profilesRes.data)

    setLoading(false)
  }

  const updateGroupTerritory = async (groupId: string, territoryId: string | null) => {
    const { error } = await supabase
      .from('facebook_groups')
      .update({ territory_id: territoryId })
      .eq('id', groupId)

    if (error) {
      alert('Failed to update group territory')
    } else {
      setEditingGroupId(null)
      fetchData()
    }
  }

  const updateProfileTerritories = async (profileId: string, territoryIds: string[]) => {
    const { error } = await supabase
      .from('profiles')
      .update({ territory_ids: territoryIds })
      .eq('id', profileId)

    if (error) {
      alert('Failed to update user territories')
    } else {
      setEditingProfileId(null)
      fetchData()
    }
  }

  const toggleProfileTerritory = (profile: Profile, territoryId: string) => {
    const currentIds = profile.territory_ids || []
    const newIds = currentIds.includes(territoryId)
      ? currentIds.filter(id => id !== territoryId)
      : [...currentIds, territoryId]
    
    updateProfileTerritories(profile.id, newIds)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading territories...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Territory Management</h1>
        <p className="text-gray-600 mt-1">Manage territories, assign groups, and control access</p>
      </div>

      {/* Territory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {territories.map(territory => {
          const territoryGroups = groups.filter(g => g.territory_id === territory.id)
          const territoryUsers = profiles.filter(p => p.territory_ids?.includes(territory.id))

          return (
            <Card key={territory.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{territory.name}</h3>
                    <p className="text-sm text-gray-600">
                      {territory.dealerships?.name}
                    </p>
                  </div>
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Facebook Groups:</span>
                    <span className="font-semibold">{territoryGroups.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Salespeople:</span>
                    <span className="font-semibold">{territoryUsers.length}</span>
                  </div>
                </div>

                {territory.cities && territory.cities.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 font-medium mb-1">Cities:</p>
                    <p className="text-xs text-gray-600">{territory.cities.join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Facebook Groups Assignment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Building2 className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold">Facebook Groups</h2>
          </div>

          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600">
                    {group.territory_id ? (
                      <span className="text-green-700">
                        ✓ {group.territories?.name || 'Assigned'}
                      </span>
                    ) : (
                      <span className="text-red-600">⚠️ No territory assigned</span>
                    )}
                  </p>
                </div>

                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      defaultValue={group.territory_id || ''}
                      onChange={(e) => updateGroupTerritory(group.id, e.target.value || null)}
                    >
                      <option value="">None</option>
                      {territories.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingGroupId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingGroupId(group.id)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Salespeople Territory Assignment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold">Salespeople Territory Access</h2>
          </div>

          <div className="space-y-3">
            {profiles.map(profile => (
              <div key={profile.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{profile.full_name}</h3>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                  </div>
                  {editingProfileId === profile.id ? (
                    <Button
                      size="sm"
                      onClick={() => setEditingProfileId(null)}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProfileId(profile.id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {editingProfileId === profile.id ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {territories.map(territory => {
                      const isAssigned = profile.territory_ids?.includes(territory.id)
                      return (
                        <button
                          key={territory.id}
                          onClick={() => toggleProfileTerritory(profile, territory.id)}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                            isAssigned
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {isAssigned ? '✓ ' : ''}
                          {territory.name.replace(' Territory', '')}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.territory_ids && profile.territory_ids.length > 0 ? (
                      profile.territory_ids.map(tid => {
                        const territory = territories.find(t => t.id === tid)
                        return territory ? (
                          <span
                            key={tid}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
                          >
                            {territory.name}
                          </span>
                        ) : null
                      })
                    ) : (
                      <span className="text-sm text-gray-500 italic">No territories assigned</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}