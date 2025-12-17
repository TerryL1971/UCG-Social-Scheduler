// app/dashboard/posts/create/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles, Copy, Check, Calendar, AlertTriangle, MapPin, Globe, X } from 'lucide-react'

type Territory = {
  id: string
  name: string
}

type FacebookGroup = {
  id: string
  name: string
  description: string | null
  territory_id: string | null
  territories: Territory | null
  posting_rules: {
    max_posts_per_week?: number
    best_time?: string
    notes?: string
  }
}

type GeneratedPost = {
  groupId: string
  groupName: string
  content: string
  scheduledFor: string
  territoryViolation?: boolean
}

type UserProfile = {
  territory_id: string | null
  territories: Territory | null
  all_territory_ids?: string[] // Add this
}

export default function CreatePostPage() {
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState<'input' | 'preview' | 'schedule'>('input')
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showTerritoryWarning, setShowTerritoryWarning] = useState(false)
  const [pendingViolations, setPendingViolations] = useState<string[]>([])
  const [acknowledgedViolations, setAcknowledgedViolations] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    productName: '',
    features: '',
    callToAction: '',
    tone: 'professional',
  })

  const router = useRouter()
  const supabase = createClient()

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all territories for this user
      const { data } = await supabase
        .from('profile_territories')
        .select('territory_id, is_primary, territories(id, name)')
        .eq('profile_id', user.id)

      if (data && data.length > 0) {
        // Use the primary territory, or first one if no primary
        const primaryTerritory = data.find(pt => pt.is_primary) || data[0]
        const territory = Array.isArray(primaryTerritory.territories) 
          ? primaryTerritory.territories[0] 
          : primaryTerritory.territories

        setUserProfile({
          territory_id: territory?.id || null,
          territories: territory || null,
          all_territory_ids: data.map(pt => pt.territory_id) // Store all territories
        })
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
    }
  }

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('facebook_groups')
        .select('id, name, description, territory_id, territories(id, name), posting_rules')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (data) {
        const normalizedGroups = data.map(g => ({
          ...g,
          territories: Array.isArray(g.territories) ? g.territories[0] : g.territories
        }))
        setGroups(normalizedGroups)
      }
    } catch (err) {
      console.error('Error fetching groups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()
    fetchGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkTerritoryViolation = (groupId: string): boolean => {
    const group = groups.find(g => g.id === groupId)
    if (!group || !group.territory_id || !userProfile?.all_territory_ids) return false
    
    // Check if group's territory is in user's assigned territories
    return !userProfile.all_territory_ids.includes(group.territory_id)
  }

  const toggleGroup = (groupId: string) => {
    const hasViolation = checkTerritoryViolation(groupId)
    
    if (hasViolation && !selectedGroups.includes(groupId) && !acknowledgedViolations.includes(groupId)) {
      setPendingViolations([groupId])
      setShowTerritoryWarning(true)
      return
    }

    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const acknowledgeViolation = () => {
    setAcknowledgedViolations(prev => [...prev, ...pendingViolations])
    setSelectedGroups(prev => [...prev, ...pendingViolations])
    setPendingViolations([])
    setShowTerritoryWarning(false)
  }

  const cancelViolation = () => {
    setPendingViolations([])
    setShowTerritoryWarning(false)
  }

  const generatePosts = async () => {
    if (selectedGroups.length === 0) {
      alert('Please select at least one group')
      return
    }

    setGenerating(true)
    const posts: GeneratedPost[] = []

    try {
      for (const groupId of selectedGroups) {
        const group = groups.find(g => g.id === groupId)
        if (!group) continue

        console.log('Generating post for:', group.name)

        const response = await fetch('/api/posts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: formData.productName,
            features: formData.features,
            callToAction: formData.callToAction,
            tone: formData.tone,
            groupName: group.name,
            groupDescription: group.description,
            groupRules: group.posting_rules,
          }),
        })

        console.log('API Response status:', response.status)

        const data = await response.json()
        console.log('API Response data:', data)

        if (data.error) {
          console.error('API Error:', data.error)
          alert(`Error generating post for ${group.name}: ${data.error}`)
          continue
        }

        if (data.content) {
          posts.push({
            groupId: group.id,
            groupName: group.name,
            content: data.content,
            scheduledFor: getDefaultScheduleTime(group),
            territoryViolation: checkTerritoryViolation(groupId),
          })
        } else {
          console.error('No content returned for:', group.name)
        }
      }

      if (posts.length === 0) {
        alert('Failed to generate any posts. Check the console for errors.')
        return
      }

      setGeneratedPosts(posts)
      setStep('preview')
    } catch (err) {
      console.error('Error generating posts:', err)
      alert('Failed to generate posts. Please check the console and try again.')
    } finally {
      setGenerating(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDefaultScheduleTime = (group: FacebookGroup): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(18, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  }

  const updatePostContent = (index: number, content: string) => {
    setGeneratedPosts(prev => {
      const updated = [...prev]
      updated[index].content = content
      return updated
    })
  }

  const updateScheduleTime = (index: number, time: string) => {
    setGeneratedPosts(prev => {
      const updated = [...prev]
      updated[index].scheduledFor = time
      return updated
    })
  }

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const savePosts = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const postsToInsert = generatedPosts.map(post => ({
        user_id: user.id,
        group_id: post.groupId,
        generated_content: post.content,
        scheduled_for: new Date(post.scheduledFor).toISOString(),
        status: 'pending',
        territory_violation_acknowledged: post.territoryViolation || false,
      }))

      const { error } = await supabase
        .from('scheduled_posts')
        .insert(postsToInsert)

      if (error) throw error

      alert('Posts scheduled successfully!')
      router.push('/dashboard/posts')
    } catch (err) {
      console.error('Error saving posts:', err)
      alert('Failed to save posts')
    } finally {
      setLoading(false)
    }
  }

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const violatingGroup = pendingViolations[0] ? groups.find(g => g.id === pendingViolations[0]) : null

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Territory Warning Modal */}
      {showTerritoryWarning && violatingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-orange-500 border-2">
            <CardHeader className="bg-orange-50">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <CardTitle className="text-orange-900">Territory Violation Warning</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  You are attempting to post to a group outside your assigned territory:
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Your Territory:</span>
                    <span className="text-sm">{userProfile?.territories?.name || 'Not Assigned'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Group Territory:</span>
                    <span className="text-sm">{violatingGroup.territories?.name || 'Not Assigned'}</span>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-800">
                    ⚠️ This action will be logged and visible to management. Territory violations should only be made with proper authorization.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={acknowledgeViolation}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  I Understand, Post Anyway
                </Button>
                <Button
                  onClick={cancelViolation}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create AI-Powered Post</h1>
        <p className="text-gray-600 mt-1">
          Generate custom content for your Facebook groups
        </p>
        {userProfile?.territories && (
          <div className="mt-2 inline-flex items-center space-x-2 text-sm bg-blue-50 px-3 py-1 rounded-full">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Your Territory: <span className="font-medium">{userProfile.territories.name}</span></span>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${step === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'input' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>1</div>
          <span className="font-medium">Details</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>2</div>
          <span className="font-medium">Preview</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className={`flex items-center space-x-2 ${step === 'schedule' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>3</div>
          <span className="font-medium">Schedule</span>
        </div>
      </div>

      {/* Step 1: Input Form */}
      {step === 'input' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>What are you advertising?</CardTitle>
              <CardDescription>
                Provide details about your product or service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product/Service Name *</label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="e.g., 2024 Honda Accord"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Key Features *</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="e.g., Low mileage, excellent condition, one owner, full service history"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Call to Action *</label>
                <Input
                  value={formData.callToAction}
                  onChange={(e) => setFormData({ ...formData, callToAction: e.target.value })}
                  placeholder="e.g., Call us today for a test drive!"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tone</label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Groups ({selectedGroups.length})</CardTitle>
              <CardDescription>
                Choose which groups to post to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No active groups found. Please add groups first.
                </p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g) => {
                    const isSelected = selectedGroups.includes(g.id)
                    const hasViolation = checkTerritoryViolation(g.id)
                    const isAcknowledged = acknowledgedViolations.includes(g.id)
                    
                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? hasViolation
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium">{g.name}</h3>
                              {hasViolation && isSelected && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Territory Violation
                                </span>
                              )}
                            </div>
                            {g.description && (
                              <p className="text-sm text-gray-600 mb-2">{g.description}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              {g.territories ? (
                                <div className="flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {g.territories.name}
                                </div>
                              ) : (
                                <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  <Globe className="w-3 h-3 mr-1" />
                                  All Territories
                                </div>
                              )}
                            </div>
                            {hasViolation && isAcknowledged && (
                              <p className="text-xs text-orange-600 mt-2">
                                ⚠️ Violation acknowledged - will be logged
                              </p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ml-3 ${
                            isSelected
                              ? hasViolation
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex space-x-3">
            <Button
              onClick={generatePosts}
              disabled={generating || !formData.productName || !formData.features || selectedGroups.length === 0}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Posts
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/posts')}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Preview & Edit */}
      {step === 'preview' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Generated Posts</CardTitle>
              <CardDescription>
                Edit the content if needed, then proceed to scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {generatedPosts.map((post, index) => (
                <div key={index} className={`border rounded-lg p-4 space-y-3 ${
                  post.territoryViolation ? 'border-orange-300 bg-orange-50' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{post.groupName}</h3>
                      {post.territoryViolation && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-200 text-orange-900 rounded">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Territory Violation
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(post.content, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <textarea
                    value={post.content}
                    onChange={(e) => updatePostContent(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-32"
                  />
                  <p className="text-sm text-gray-500">{post.content.length} characters</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex space-x-3">
            <Button onClick={() => setStep('schedule')}>
              <Calendar className="w-4 h-4 mr-2" />
              Continue to Schedule
            </Button>
            <Button variant="outline" onClick={() => setStep('input')}>
              Back
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Schedule */}
      {step === 'schedule' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Schedule Your Posts</CardTitle>
              <CardDescription>
                Set when you want to be reminded to post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedPosts.map((post, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  post.territoryViolation ? 'border-orange-300 bg-orange-50' : ''
                }`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="font-semibold">{post.groupName}</h3>
                    {post.territoryViolation && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-200 text-orange-900 rounded">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Violation Logged
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      value={post.scheduledFor}
                      onChange={(e) => updateScheduleTime(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {generatedPosts.some(p => p.territoryViolation) && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="py-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Territory Violations Will Be Logged</p>
                    <p>Management will be able to see that you posted to groups outside your assigned territory. Make sure you have proper authorization.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-3">
            <Button onClick={savePosts} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Schedule Posts'
              )}
            </Button>
            <Button variant="outline" onClick={() => setStep('preview')}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  )
}