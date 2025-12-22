// app/dashboard/my-violations/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Textarea component removed - we'll use standard textarea
import { 
  AlertTriangle, 
  Edit, 
  Trash2, 
  CheckCircle,
  MessageSquare,
  Clock
} from 'lucide-react'
import Link from 'next/link'

type Violation = {
  id: string
  scheduled_for: string
  status: string
  violation_status: string
  violation_justification: string | null
  authorization_requested_at: string | null
  authorization_granted_at: string | null
  generated_content: string
  facebook_groups: {
    name: string
    territory_id: string | null
    territories: {
      name: string
    } | null
  } | null
}

export default function MyViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [justificationText, setJustificationText] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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

      const { data } = await supabase
        .from('scheduled_posts')
        .select(`
          id,
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
        .eq('user_id', user.id)
        .eq('territory_violation_acknowledged', true)
        .order('scheduled_for', { ascending: false })

      setViolations((data || []).map(item => {
        const group = Array.isArray(item.facebook_groups) 
          ? item.facebook_groups[0] 
          : item.facebook_groups
        
        return {
          ...item,
          facebook_groups: group ? {
            ...group,
            territories: Array.isArray(group.territories) 
              ? group.territories[0] 
              : group.territories
          } : null
        }
      }) as Violation[])
    } catch (err) {
      console.error('Error fetching violations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAuthorization = async (violationId: string) => {
    setActionLoading(violationId)
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          violation_status: 'authorization_requested',
          authorization_requested_at: new Date().toISOString()
        })
        .eq('id', violationId)

      if (error) throw error
      
      await fetchViolations()
      alert('Authorization request sent to your manager!')
    } catch (err) {
      console.error('Error requesting authorization:', err)
      alert('Failed to request authorization')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddJustification = async (violationId: string) => {
    const justification = justificationText[violationId]
    if (!justification?.trim()) {
      alert('Please enter a justification')
      return
    }

    setActionLoading(violationId)
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          violation_status: 'justified',
          violation_justification: justification
        })
        .eq('id', violationId)

      if (error) throw error
      
      await fetchViolations()
      setJustificationText(prev => ({ ...prev, [violationId]: '' }))
      alert('Justification added successfully!')
    } catch (err) {
      console.error('Error adding justification:', err)
      alert('Failed to add justification')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePost = async (violationId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setActionLoading(violationId)
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', violationId)

      if (error) throw error
      
      await fetchViolations()
      alert('Post deleted successfully')
    } catch (err) {
      console.error('Error deleting post:', err)
      alert('Failed to delete post')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (violation: Violation) => {
    if (violation.authorization_granted_at) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Authorized
        </span>
      )
    }
    if (violation.authorization_requested_at) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Pending Approval
        </span>
      )
    }
    if (violation.violation_status === 'justified') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded flex items-center">
          <MessageSquare className="w-3 h-3 mr-1" />
          Justified
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded flex items-center">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Needs Action
      </span>
    )
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Territory Violations</h1>
        <p className="text-gray-600 mt-1">Manage and resolve your territory violations</p>
      </div>

      {violations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Violations</h3>
                                    <p className="text-gray-600">You don&apos;t have any territory violations. Great job! 🎉</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {violations.map((violation) => (
            <Card key={violation.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Territory Violation
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
                  {getStatusBadge(violation)}
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
                    <p className="text-sm font-medium text-purple-900 mb-1">Your Justification:</p>
                    <p className="text-sm text-purple-800">{violation.violation_justification}</p>
                  </div>
                )}

                {!violation.authorization_granted_at && !violation.authorization_requested_at && (
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/posts/${violation.id}/edit`}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === violation.id}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit Post
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAuthorization(violation.id)}
                        disabled={actionLoading === violation.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Request Authorization
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePost(violation.id)}
                        disabled={actionLoading === violation.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Post
                      </Button>
                    </div>

                    {/* Justification Input */}
                    {violation.violation_status !== 'justified' && (
                      <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Add Justification
                        </label>
                        <textarea
                          placeholder="Explain why you need to post in this territory..."
                          value={justificationText[violation.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJustificationText(prev => ({
                            ...prev,
                            [violation.id]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          rows={3}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddJustification(violation.id)}
                          disabled={actionLoading === violation.id || !justificationText[violation.id]?.trim()}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Submit Justification
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {violation.authorization_requested_at && !violation.authorization_granted_at && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Authorization requested on {new Date(violation.authorization_requested_at).toLocaleString()}. 
                      Waiting for manager approval.
                    </p>
                  </div>
                )}

                {violation.authorization_granted_at && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Authorization granted on {new Date(violation.authorization_granted_at).toLocaleString()}
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