// components/TerritoryRequestSystem.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react'

type TerritoryRequest = {
  id: string
  salesperson_id: string
  territory_id: string
  request_message: string | null
  status: 'pending' | 'approved' | 'denied'
  reviewed_by: string | null
  reviewed_at: string | null
  denial_reason: string | null
  created_at: string
  profiles: {
    full_name: string | null
    email: string
    dealership_id: string | null
    dealerships: {
      name: string
    } | null
  } | null
  territories: {
    name: string
  } | null
}

type Territory = {
  id: string
  name: string
}

type UserRole = 'salesperson' | 'manager' | 'admin' | 'owner'

export function TerritoryRequestSystem({ userRole }: { userRole: UserRole }) {
  const [requests, setRequests] = useState<TerritoryRequest[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState<string>('')
  const [requestMessage, setRequestMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const isManager = userRole === 'manager' || userRole === 'admin' || userRole === 'owner'
  const isSalesperson = userRole === 'salesperson'

  console.log('🎭 TerritoryRequestSystem rendering')
  console.log('👤 userRole:', userRole)
  console.log('👨‍💼 isManager:', isManager)
  console.log('👨‍💻 isSalesperson:', isSalesperson)
  console.log('📦 About to render, isSalesperson check:', isSalesperson)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔍 Current user:', user?.id)
      console.log('👤 User role:', userRole)
      if (!user) return

      // Fetch territories
      const { data: territoriesData, error: territoriesError } = await supabase
        .from('territories')
        .select('id, name')
        .order('name')

      console.log('🗺️ Territories:', territoriesData, 'Error:', territoriesError)
      setTerritories(territoriesData || [])

      // Fetch requests based on role
      let requestsQuery = supabase
        .from('territory_requests')
        .select(`
          *,
          profiles!territory_requests_salesperson_id_fkey (
            full_name,
            email,
            dealership_id,
            dealerships(name)
          ),
          territories(name)
        `)
        .order('created_at', { ascending: false })

      // If salesperson, only show their requests
      if (isSalesperson) {
        requestsQuery = requestsQuery.eq('salesperson_id', user.id)
      }

      const { data: requestsData, error: requestsError } = await requestsQuery
      
      console.log('📋 Requests:', requestsData, 'Error:', requestsError)

      setRequests((requestsData || []).map(r => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
        territories: Array.isArray(r.territories) ? r.territories[0] : r.territories
      })) as TerritoryRequest[])

    } catch (err) {
      console.error('❌ Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitRequest = async () => {
    if (!selectedTerritory) {
      alert('Please select a territory')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('territory_requests')
        .insert({
          salesperson_id: user.id,
          territory_id: selectedTerritory,
          request_message: requestMessage,
          status: 'pending'
        })

      if (error) throw error

      setShowRequestModal(false)
      setSelectedTerritory('')
      setRequestMessage('')
      await fetchData()
      alert('Territory access request submitted! Your manager will review it.')
    } catch (err) {
      console.error('Error submitting request:', err)
      alert('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const approveRequest = async (requestId: string, salespersonId: string, territoryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update request status
      const { error: updateError } = await supabase
        .from('territory_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Add territory assignment
      const { error: assignError } = await supabase
        .from('profile_territories')
        .insert({
          profile_id: salespersonId,
          territory_id: territoryId,
          is_primary: false
        })

      if (assignError) throw assignError

      await fetchData()
      alert('Request approved and territory assigned!')
    } catch (err) {
      console.error('Error approving request:', err)
      alert('Failed to approve request')
    }
  }

  const denyRequest = async (requestId: string) => {
    const reason = prompt('Reason for denial (optional):')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('territory_requests')
        .update({
          status: 'denied',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          denial_reason: reason
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchData()
      alert('Request denied')
    } catch (err) {
      console.error('Error denying request:', err)
      alert('Failed to deny request')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'denied':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Salesperson View - Request Button */}
      {isSalesperson && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold">Request Territory Access</h3>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 text-black"
                onClick={() => {
                  console.log('🔘 Button clicked!')
                  setShowRequestModal(true)
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Need access to a territory? Submit a request and your manager will review it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Manager View - Pending Requests Alert */}
      {isManager && requests.filter(r => r.status === 'pending').length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {requests.filter(r => r.status === 'pending').length} pending territory request
                {requests.filter(r => r.status === 'pending').length !== 1 ? 's' : ''} awaiting review
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isManager ? 'Territory Access Requests' : 'My Territory Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No requests found
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {isManager && (
                        <h3 className="font-semibold text-gray-900">
                          {request.profiles?.full_name || request.profiles?.email}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {request.territories?.name}
                        </span>
                      </div>
                      {isManager && request.profiles?.dealerships && (
                        <p className="text-xs text-gray-500 mt-1">
                          {request.profiles.dealerships.name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  {request.request_message && (
                    <div className="bg-gray-50 rounded p-3 mt-2 mb-3">
                      <p className="text-sm text-gray-700">{request.request_message}</p>
                    </div>
                  )}

                  {request.denial_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-2 mb-3">
                      <p className="text-sm font-medium text-red-900 mb-1">Denial Reason:</p>
                      <p className="text-sm text-red-800">{request.denial_reason}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                    {request.reviewed_at && (
                      <span>Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Manager Actions */}
                  {isManager && request.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => approveRequest(
                          request.id,
                          request.salesperson_id,
                          request.territory_id
                        )}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => denyRequest(request.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Modal for Salespeople */}
      {showRequestModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRequestModal(false)
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Request Territory Access</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Territory *
                </label>
                <select
                  value={selectedTerritory}
                  onChange={(e) => setSelectedTerritory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a territory...</option>
                  {territories.map(territory => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Request
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Explain why you need access to this territory..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={submitRequest}
                disabled={submitting || !selectedTerritory}
                className="flex-1 bg-red-600 hover:bg-red-700 text-black"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestModal(false)
                  setSelectedTerritory('')
                  setRequestMessage('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}