// app/dashboard/violations/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  MessageSquare,
  User,
  Mail,
  MessageCircle
} from 'lucide-react'

type Violation = {
  id: string
  scheduled_for: string
  status: string
  violation_status: string
  violation_justification: string | null
  authorization_requested_at: string | null
  authorization_granted_at: string | null
  generated_content: string
  profiles: {
    full_name: string | null
    email: string
  } | null
  facebook_groups: {
    name: string
    territory_id: string | null
    territories: {
      name: string
    } | null
  } | null
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'authorized' | 'justified'>('all')
  const [isManager, setIsManager] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchViolations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchViolations = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is manager/admin/owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, dealership_id')
        .eq('id', user.id)
        .single()

      const userIsManager = profile?.role === 'manager' || profile?.role === 'admin' || profile?.role === 'owner'
      setIsManager(userIsManager)

      if (!userIsManager) {
        return
      }

      // Fetch all violations from the dealership (or all if owner)
      const query = supabase
        .from('scheduled_posts')
        .select(`
          id,
          user_id,
          scheduled_for,
          status,
          violation_status,
          violation_justification,
          authorization_requested_at,
          authorization_granted_at,
          generated_content,
          facebook_groups (
            name,
            territory_id,
            territories(name)
          )
        `)
        .eq('territory_violation_acknowledged', true)
        .order('authorization_requested_at', { ascending: false, nullsFirst: false })

      const { data, error } = await query
      
      console.log('🔍 Raw violations data:', data)
      console.log('❌ Query error:', error)
      console.log('👤 Your profile:', profile)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Now fetch profile info separately for each post
      const userIds = [...new Set((data || []).map(v => v.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, dealership_id')
        .in('id', userIds)

      console.log('👥 Profiles data:', profilesData)

      // Map profiles to violations
      const violationsWithProfiles = (data || []).map(v => ({
        ...v,
        profiles: (profilesData || []).find(p => p.id === v.user_id)
      }))

      // Filter by dealership unless owner
      let filteredData = violationsWithProfiles
      if (profile?.role !== 'owner') {
        filteredData = violationsWithProfiles.filter(v => {
          console.log('Checking violation:', v.id, 'User dealership:', v.profiles?.dealership_id, 'Your dealership:', profile?.dealership_id)
          return v.profiles?.dealership_id === profile?.dealership_id
        })
      }
      
      console.log('✅ Filtered violations:', filteredData.length)

      setViolations(filteredData.map(item => {
        const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        const groupData = Array.isArray(item.facebook_groups) ? item.facebook_groups[0] : item.facebook_groups
        
        return {
          ...item,
          profiles: profileData,
          facebook_groups: groupData ? {
            ...groupData,
            territories: Array.isArray(groupData.territories) 
              ? groupData.territories[0] 
              : groupData.territories
          } : null
        }
      }) as Violation[])
    } catch (err) {
      console.error('Error fetching violations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (violationId: string) => {
    if (!confirm('Approve this authorization request? The post will be allowed in this territory.')) {
      return
    }

    setActionLoading(violationId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          violation_status: 'authorized',
          authorization_granted_by: user.id,
          authorization_granted_at: new Date().toISOString()
        })
        .eq('id', violationId)

      if (error) throw error
      
      await fetchViolations()
      alert('Authorization approved!')
    } catch (err) {
      console.error('Error approving authorization:', err)
      alert('Failed to approve authorization')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeny = async (violationId: string) => {
    if (!confirm('Deny this authorization request? The salesperson will need to take other corrective action.')) {
      return
    }

    setActionLoading(violationId)
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          violation_status: 'denied',
          authorization_requested_at: null
        })
        .eq('id', violationId)

      if (error) throw error
      
      await fetchViolations()
      alert('Authorization denied. Salesperson has been notified.')
    } catch (err) {
      console.error('Error denying authorization:', err)
      alert('Failed to deny authorization')
    } finally {
      setActionLoading(null)
    }
  }

  const sendEmail = (email: string, name: string, violationType: string) => {
    const subject = encodeURIComponent('Territory Violation - Action Required')
    const body = encodeURIComponent(
      `Hi ${name},\n\nI noticed you have a ${violationType} territory violation that needs attention. Please review and take appropriate corrective action:\n\n1. Edit the post to change the group to one in your territory\n2. Request authorization if you have a valid reason\n3. Add a justification explaining the situation\n4. Delete the post if it was created in error\n\nPlease address this as soon as possible.\n\nBest regards`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
  }

  const sendWhatsApp = (violation: Violation) => {
    // For demo, we'll show an alert since we don't have real phone numbers
    alert(`WhatsApp feature: In production, this would send a message to ${violation.profiles?.full_name}'s phone number about their ${violation.violation_status} violation.`)
    
    // Real implementation would be:
    // const phone = violation.profiles?.phone || ''
    // const cleanPhone = phone.replace(/[^0-9]/g, '')
    // const message = encodeURIComponent(`Hi ${violation.profiles?.full_name}, please review your territory violation.`)
    // window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
  }

  const getFilteredViolations = () => {
    switch (filter) {
      case 'pending':
        return violations.filter(v => v.authorization_requested_at && !v.authorization_granted_at)
      case 'authorized':
        return violations.filter(v => v.authorization_granted_at)
      case 'justified':
        return violations.filter(v => v.violation_status === 'justified')
      default:
        return violations
    }
  }

  const filteredViolations = getFilteredViolations()
  const pendingCount = violations.filter(v => v.authorization_requested_at && !v.authorization_granted_at).length
  const authorizedCount = violations.filter(v => v.authorization_granted_at).length
  const justifiedCount = violations.filter(v => v.violation_status === 'justified').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading violations...</p>
        </div>
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">Only managers can view this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Territory Violations</h1>
        <p className="text-gray-600 mt-1">Review and manage territory violations from your team</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-3xl font-bold text-orange-600">{violations.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingCount > 0 ? 'border-2 border-blue-500' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-3xl font-bold text-blue-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Authorized</p>
                <p className="text-3xl font-bold text-green-600">{authorizedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Justified</p>
                <p className="text-3xl font-bold text-purple-600">{justifiedCount}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium ${
            filter === 'all'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({violations.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium ${
            filter === 'pending'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Approval ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('authorized')}
          className={`px-4 py-2 font-medium ${
            filter === 'authorized'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Authorized ({authorizedCount})
        </button>
        <button
          onClick={() => setFilter('justified')}
          className={`px-4 py-2 font-medium ${
            filter === 'justified'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Justified ({justifiedCount})
        </button>
      </div>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Violations</h3>
              <p className="text-gray-600">No violations found in this category.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredViolations.map((violation) => (
            <Card key={violation.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-600" />
                      {violation.profiles?.full_name || violation.profiles?.email || 'Unknown User'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Posted to: <strong>{violation.facebook_groups?.name || 'Unknown Group'}</strong>
                      {violation.facebook_groups?.territories && (
                        <span className="ml-2">
                          ({violation.facebook_groups.territories.name})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Scheduled: {new Date(violation.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {violation.authorization_granted_at ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Authorized
                      </span>
                    ) : violation.authorization_requested_at ? (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Approval
                      </span>
                    ) : violation.violation_status === 'justified' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded flex items-center">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Justified
                      </span>
                    ) : violation.violation_status === 'denied' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded flex items-center">
                        <XCircle className="w-3 h-3 mr-1" />
                        Denied
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Unresolved
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {violation.generated_content}
                  </p>
                </div>

                {violation.violation_justification && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-sm font-medium text-purple-900 mb-1">Salesperson Justification:</p>
                    <p className="text-sm text-purple-800">{violation.violation_justification}</p>
                  </div>
                )}

                {/* Contact buttons for unresolved violations */}
                {(violation.violation_status === 'unresolved' || violation.violation_status === 'denied') && (
                  <div className="mb-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendEmail(
                        violation.profiles?.email || '', 
                        violation.profiles?.full_name || 'Salesperson',
                        violation.violation_status
                      )}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email Follow-up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendWhatsApp(violation)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                )}

                {violation.authorization_requested_at && !violation.authorization_granted_at && violation.violation_status !== 'denied' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(violation.id)}
                      disabled={actionLoading === violation.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeny(violation.id)}
                      disabled={actionLoading === violation.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                )}

                {violation.authorization_granted_at && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Authorized on {new Date(violation.authorization_granted_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {violation.violation_status === 'denied' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Authorization denied. Salesperson must take other corrective action.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}