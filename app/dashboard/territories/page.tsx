// app/dashboard/territories/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { MapPin, Users, Building2, Edit, Save, X, Plus, Trash2 } from 'lucide-react'
import { TerritoryRequestSystem } from '@/components/TerritoryRequestSystem'
import { toast } from 'sonner'

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
  dealership_id: string
  profile_territories: {
    territory_id: string
    is_primary: boolean
  }[]
}

interface CityEdit {
  name: string
  zipCodes: string
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [editingCitiesId, setEditingCitiesId] = useState<string | null>(null)
  const [cityEdits, setCityEdits] = useState<{ [key: string]: CityEdit[] }>({})
  const [userRole, setUserRole] = useState<'salesperson' | 'manager' | 'admin' | 'owner'>('salesperson')
  const [groupSearchTerm, setGroupSearchTerm] = useState('')
  const [selectedTerritoryFilter, setSelectedTerritoryFilter] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true)

    // Get current user's role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserRole(profile.role as 'salesperson' | 'manager' | 'admin' | 'owner')
      }
    }

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
        .select('id, full_name, email, dealership_id, profile_territories(territory_id, is_primary)')
        .order('full_name')
    ])

    if (territoriesRes.data) setTerritories(territoriesRes.data as unknown as Territory[])
    if (groupsRes.data) setGroups(groupsRes.data as unknown as FacebookGroup[])
    if (profilesRes.data) setProfiles(profilesRes.data as unknown as Profile[])

    setLoading(false)
  }

  const updateGroupTerritory = async (groupId: string, territoryId: string | null) => {
    const { error } = await supabase
      .from('facebook_groups')
      .update({ territory_id: territoryId })
      .eq('id', groupId)

    if (error) {
      toast.error('Failed to update group territory')
    } else {
      setEditingGroupId(null)
      fetchData()
      toast.success('Group territory updated')
    }
  }

  const toggleProfileTerritory = async (profile: Profile, territoryId: string) => {
    const currentTerritories = profile.profile_territories || []
    const isAssigned = currentTerritories.some(pt => pt.territory_id === territoryId)

    if (isAssigned) {
      // Remove territory
      const { error } = await supabase
        .from('profile_territories')
        .delete()
        .eq('profile_id', profile.id)
        .eq('territory_id', territoryId)

      if (error) {
        toast.error('Failed to remove territory')
      } else {
        fetchData()
        toast.success('Territory removed')
      }
    } else {
      // Add territory (make it primary if it's the first one)
      const isPrimary = currentTerritories.length === 0

      const { error } = await supabase
        .from('profile_territories')
        .insert({
          profile_id: profile.id,
          territory_id: territoryId,
          is_primary: isPrimary
        })

      if (error) {
        toast.error('Failed to add territory')
      } else {
        fetchData()
        toast.success('Territory added')
      }
    }
  }

  const setPrimaryTerritory = async (profileId: string, territoryId: string) => {
    // First, unset all primary flags for this profile
    await supabase
      .from('profile_territories')
      .update({ is_primary: false })
      .eq('profile_id', profileId)

    // Then set the selected one as primary
    const { error } = await supabase
      .from('profile_territories')
      .update({ is_primary: true })
      .eq('profile_id', profileId)
      .eq('territory_id', territoryId)

    if (error) {
      toast.error('Failed to set primary territory')
    } else {
      fetchData()
      toast.success('Primary territory updated')
    }
  }

  const startEditingCities = (territoryId: string, cities: string[], zipCodes: string[]) => {
    setEditingCitiesId(territoryId)
    
    // Create city edits from existing data
    const edits: CityEdit[] = cities.map((city, index) => ({
      name: city,
      zipCodes: zipCodes[index] || ''
    }))
    
    setCityEdits({ ...cityEdits, [territoryId]: edits })
  }

  const addCity = (territoryId: string) => {
    const currentEdits = cityEdits[territoryId] || []
    setCityEdits({
      ...cityEdits,
      [territoryId]: [...currentEdits, { name: '', zipCodes: '' }]
    })
  }

  const updateCity = (territoryId: string, index: number, field: 'name' | 'zipCodes', value: string) => {
    const currentEdits = [...(cityEdits[territoryId] || [])]
    currentEdits[index] = { ...currentEdits[index], [field]: value }
    setCityEdits({ ...cityEdits, [territoryId]: currentEdits })
  }

  const removeCity = (territoryId: string, index: number) => {
    const currentEdits = [...(cityEdits[territoryId] || [])]
    currentEdits.splice(index, 1)
    setCityEdits({ ...cityEdits, [territoryId]: currentEdits })
  }

  const saveCities = async (territoryId: string) => {
    const edits = cityEdits[territoryId] || []
    
    // Filter out empty entries
    const validEdits = edits.filter(e => e.name.trim() !== '')
    
    const cities = validEdits.map(e => e.name.trim())
    const zipCodes = validEdits.map(e => e.zipCodes.trim())

    console.log('Saving cities:', { territoryId, cities, zipCodes })

    const { data, error } = await supabase
      .from('territories')
      .update({
        cities,
        zip_codes: zipCodes
      })
      .eq('id', territoryId)
      .select()

    console.log('Save result:', { data, error })

    if (error) {
      toast.error('Failed to update cities: ' + error.message)
      console.error('Full error:', error)
    } else {
      setEditingCitiesId(null)
      fetchData()
      toast.success('Cities updated successfully')
      console.log('Updated territory:', data)
    }
  }

  const cancelEditingCities = () => {
    setEditingCitiesId(null)
    setCityEdits({})
  }

  const isManager = userRole === 'manager' || userRole === 'admin' || userRole === 'owner'

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading territories...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Territory Management</h1>
        <p className="text-gray-600 mt-1">Manage territories, assign groups, and control access</p>
      </div>

      {/* Territory Request System - Shows for all users */}
      <TerritoryRequestSystem userRole={userRole} />

      {/* Territory Overview - Only show to managers */}
      {isManager && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {territories.map(territory => {
            const territoryGroups = groups.filter(g => g.territory_id === territory.id)
            const territoryUsers = profiles.filter(p => 
              p.profile_territories?.some(pt => pt.territory_id === territory.id)
            )
            const isEditingCities = editingCitiesId === territory.id
            const edits = cityEdits[territory.id] || []

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
                    <MapPin className="w-5 h-5 text-red-600" />
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

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 font-medium">Cities:</p>
                      {!isEditingCities && (
                        <button
                          onClick={() => startEditingCities(territory.id, territory.cities || [], territory.zip_codes || [])}
                          className="flex items-center gap-1 h-6 px-2 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    
                    {isEditingCities ? (
                      <div className="space-y-2">
                        {edits.map((edit, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Input
                                value={edit.name}
                                onChange={(e) => updateCity(territory.id, index, 'name', e.target.value)}
                                placeholder="City name"
                                className="text-xs h-7"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => removeCity(territory.id, index)}
                                className="h-7 px-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <Input
                              value={edit.zipCodes}
                              onChange={(e) => updateCity(territory.id, index, 'zipCodes', e.target.value)}
                              placeholder="Zip codes (comma-separated)"
                              className="text-xs h-7"
                            />
                          </div>
                        ))}
                        
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            onClick={() => addCity(territory.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add City
                          </Button>
                        </div>
                        
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            onClick={() => saveCities(territory.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 h-7 text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={cancelEditingCities}
                            className="flex-1 h-7 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        {territory.cities && territory.cities.length > 0 ? (
                          territory.cities.map((city, idx) => (
                            <div key={idx} className="mb-1">
                              <span className="font-medium">{city}</span>
                              {territory.zip_codes && territory.zip_codes[idx] && (
                                <span className="text-gray-500"> ({territory.zip_codes[idx]})</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">No cities assigned</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Facebook Groups Assignment - Only show to managers */}
      {isManager && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-red-600" />
                <h2 className="text-xl font-semibold">Facebook Groups</h2>
                <span className="ml-2 text-sm text-gray-500">({groups.length} total)</span>
              </div>
              
              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={selectedTerritoryFilter}
                  onChange={(e) => setSelectedTerritoryFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Territories</option>
                  <option value="unassigned">Unassigned</option>
                  {territories.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                
                <Input
                  type="text"
                  placeholder="Search groups..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                // Filter groups
                let filteredGroups = groups.filter(group => {
                  // Territory filter
                  if (selectedTerritoryFilter === 'unassigned' && group.territory_id !== null) return false
                  if (selectedTerritoryFilter !== 'all' && selectedTerritoryFilter !== 'unassigned' && group.territory_id !== selectedTerritoryFilter) return false
                  
                  // Search filter
                  if (groupSearchTerm && !group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())) return false
                  
                  return true
                })

                if (filteredGroups.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No groups found matching your filters
                    </div>
                  )
                }

                return filteredGroups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                          variant="secondary"
                          onClick={() => setEditingGroupId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingGroupId(group.id)}
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salespeople Territory Assignment - Only show to managers */}
      {isManager && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 mr-2 text-red-600" />
              <h2 className="text-xl font-semibold">Salespeople Territory Access</h2>
            </div>

            <div className="space-y-3">
              {profiles.map(profile => {
                const assignedTerritories = profile.profile_territories || []
                const primaryTerritory = assignedTerritories.find(pt => pt.is_primary)

                return (
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
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Done
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingProfileId(profile.id)}
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {editingProfileId === profile.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {territories.map(territory => {
                            const isAssigned = assignedTerritories.some(pt => pt.territory_id === territory.id)
                            const isPrimary = primaryTerritory?.territory_id === territory.id
                            
                            return (
                              <div key={territory.id} className="relative">
                                <button
                                  onClick={() => toggleProfileTerritory(profile, territory.id)}
                                  className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                                    isAssigned
                                      ? isPrimary
                                        ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                  }`}
                                >
                                  {isAssigned ? '✓ ' : ''}
                                  {territory.name.replace(' Territory', '')}
                                  {isPrimary && <span className="ml-1">⭐</span>}
                                </button>
                                {isAssigned && !isPrimary && (
                                  <button
                                    onClick={() => setPrimaryTerritory(profile.id, territory.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-yellow-900 rounded-full text-xs hover:bg-yellow-500"
                                    title="Set as primary"
                                  >
                                    ⭐
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs text-gray-600 italic">
                          💡 Click territories to assign/unassign. Click ⭐ to set primary territory.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignedTerritories.length > 0 ? (
                          assignedTerritories.map(pt => {
                            const territory = territories.find(t => t.id === pt.territory_id)
                            return territory ? (
                              <span
                                key={pt.territory_id}
                                className={`px-2 py-1 rounded text-sm ${
                                  pt.is_primary
                                    ? 'bg-red-600 text-white font-medium'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {territory.name}
                                {pt.is_primary && ' ⭐'}
                              </span>
                            ) : null
                          })
                        ) : (
                          <span className="text-sm text-gray-500 italic">No territories assigned</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}