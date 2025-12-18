// app/dashboard/management/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Mail,
  MessageCircle,
  CheckCircle,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'

type Salesperson = {
  id: string
  full_name: string
  email: string
  phone?: string
  totalPosts: number
  pendingPosts: number
  completedPosts: number
  violations: number
  complianceRate: number
  territories: string[]
}

type Dealership = {
  id: string
  name: string
  location: string
  salespeople: Salesperson[]
  totalPosts: number
  totalViolations: number
  complianceRate: number
}

export default function ManagementDashboard() {
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [expandedDealership, setExpandedDealership] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchManagementData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchManagementData = async () => {
    setLoading(true)
    try {
      // Fetch all dealerships
      const { data: dealershipsData } = await supabase
        .from('dealerships')
        .select('*')
        .order('name')

      // Fetch all salespeople with their stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          dealership_id,
          role,
          profile_territories(
            territory_id,
            is_primary,
            territories(name)
          )
        `)
        .in('role', ['salesperson', 'manager'])

      // Fetch all posts
      const { data: allPosts } = await supabase
        .from('scheduled_posts')
        .select('user_id, status, territory_violation_acknowledged')

      // Process data by dealership
      const dealershipsWithStats: Dealership[] = (dealershipsData || []).map(dealership => {
        const dealershipSalespeople = (profiles || []).filter(
          p => p.dealership_id === dealership.id
        )

        const salespeople: Salesperson[] = dealershipSalespeople.map(person => {
          const personPosts = (allPosts || []).filter(p => p.user_id === person.id)
          const violations = personPosts.filter(p => p.territory_violation_acknowledged).length
          const totalPosts = personPosts.length
          const compliance = totalPosts > 0 
            ? Math.round(((totalPosts - violations) / totalPosts) * 100) 
            : 100

          // Get territory names
          const territories = (person.profile_territories || []).map(pt => {
            const territory = Array.isArray(pt.territories) ? pt.territories[0] : pt.territories
            return territory?.name || 'Unknown'
          })

          return {
            id: person.id,
            full_name: person.full_name || person.email,
            email: person.email,
            totalPosts: totalPosts,
            pendingPosts: personPosts.filter(p => p.status === 'pending').length,
            completedPosts: personPosts.filter(p => p.status === 'posted').length,
            violations,
            complianceRate: compliance,
            territories
          }
        })

        const totalPosts = salespeople.reduce((sum, s) => sum + s.totalPosts, 0)
        const totalViolations = salespeople.reduce((sum, s) => sum + s.violations, 0)
        const complianceRate = totalPosts > 0
          ? Math.round(((totalPosts - totalViolations) / totalPosts) * 100)
          : 100

        return {
          id: dealership.id,
          name: dealership.name,
          location: dealership.location || 'Unknown',
          salespeople,
          totalPosts,
          totalViolations,
          complianceRate
        }
      })

      setDealerships(dealershipsWithStats)
    } catch (err) {
      console.error('Error fetching management data:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = (email: string, name: string, violations: number) => {
    const subject = encodeURIComponent('Territory Violation Notice')
    const body = encodeURIComponent(
      `Hi ${name},\n\nI noticed you have ${violations} territory violation${violations !== 1 ? 's' : ''} this month. Please make sure you have proper authorization before posting outside your assigned territories.\n\nBest regards`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
  }

  const sendWhatsApp = (phone: string | undefined, name: string) => {
    if (!phone) {
      alert('No phone number on file')
      return
    }
    const message = encodeURIComponent(
      `Hi ${name}, I wanted to follow up regarding territory compliance. Can we discuss?`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading management dashboard...</p>
        </div>
      </div>
    )
  }

  // Calculate overall stats
  const totalSalespeople = dealerships.reduce((sum, d) => sum + d.salespeople.length, 0)
  const totalPosts = dealerships.reduce((sum, d) => sum + d.totalPosts, 0)
  const totalViolations = dealerships.reduce((sum, d) => sum + d.totalViolations, 0)
  const overallCompliance = totalPosts > 0
    ? Math.round(((totalPosts - totalViolations) / totalPosts) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
        <p className="text-gray-600 mt-1">Organization-wide overview and team performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Dealerships</p>
                <p className="text-3xl font-bold text-blue-600">{dealerships.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salespeople</p>
                <p className="text-3xl font-bold text-purple-600">{totalSalespeople}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold text-green-600">{totalPosts}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={totalViolations > 0 ? 'border-orange-300' : 'border-green-300'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-3xl font-bold text-green-600">{overallCompliance}%</p>
                <p className="text-xs text-orange-600 mt-1">{totalViolations} violations</p>
              </div>
              {totalViolations > 0 ? (
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dealerships */}
      <div className="space-y-4">
        {dealerships.map(dealership => (
          <Card key={dealership.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedDealership(
                expandedDealership === dealership.id ? null : dealership.id
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle>{dealership.name}</CardTitle>
                    <p className="text-sm text-gray-600">{dealership.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Salespeople</p>
                    <p className="text-lg font-semibold">{dealership.salespeople.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Posts</p>
                    <p className="text-lg font-semibold">{dealership.totalPosts}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Compliance</p>
                    <p className={`text-lg font-semibold ${
                      dealership.complianceRate >= 90 ? 'text-green-600' :
                      dealership.complianceRate >= 75 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {dealership.complianceRate}%
                    </p>
                  </div>
                  {expandedDealership === dealership.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedDealership === dealership.id && (
              <CardContent className="bg-gray-50">
                {dealership.salespeople.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    No salespeople assigned to this dealership
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dealership.salespeople.map(person => (
                      <div key={person.id} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{person.full_name}</h4>
                              {person.violations > 0 && (
                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                                  {person.violations} violation{person.violations !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{person.email}</p>
                            
                            {/* Territories */}
                            {person.territories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {person.territories.map((territory, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
                                  >
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {territory}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Total Posts</p>
                                <p className="font-semibold text-lg">{person.totalPosts}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Pending</p>
                                <p className="font-semibold text-lg text-yellow-600">{person.pendingPosts}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Completed</p>
                                <p className="font-semibold text-lg text-green-600">{person.completedPosts}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Compliance</p>
                                <p className={`font-semibold text-lg ${
                                  person.complianceRate >= 90 ? 'text-green-600' :
                                  person.complianceRate >= 75 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {person.complianceRate}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Contact Buttons */}
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendEmail(person.email, person.full_name, person.violations)}
                              className="flex items-center"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendWhatsApp(person.phone, person.full_name)}
                              className="flex items-center"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Management Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/dashboard/violations">
              <Button variant="outline" className="w-full">
                <AlertTriangle className="w-4 h-4 mr-2" />
                All Violations
              </Button>
            </Link>
            <Link href="/dashboard/territories">
              <Button variant="outline" className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                Territories
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}