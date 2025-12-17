// app/dashboard/violations/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, Download, Filter, MapPin, User, Users } from 'lucide-react'

type Violation = {
  id: string
  created_at: string
  scheduled_for: string
  status: string
  generated_content: string
  salesperson_email: string
  salesperson_name: string
  salesperson_territory: string | null
  group_name: string
  group_territory: string | null
}

type Stats = {
  totalViolations: number
  byTerritory: Record<string, number>
  bySalesperson: Record<string, number>
  thisMonth: number
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([])
  const [stats, setStats] = useState<Stats>({
    totalViolations: 0,
    byTerritory: {},
    bySalesperson: {},
    thisMonth: 0
  })
  const [loading, setLoading] = useState(true)
  const [filterSalesperson, setFilterSalesperson] = useState('')
  const [filterTerritory, setFilterTerritory] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  const fetchViolations = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          id,
          created_at,
          scheduled_for,
          status,
          generated_content,
          profiles!inner (
            email,
            full_name,
            profile_territories!inner (
              territories (name)
            )
          ),
          facebook_groups!inner (
            name,
            territory_id,
            territories (name)
          )
        `)
        .eq('territory_violation_acknowledged', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalizedViolations: Violation[] = (data || []).map((v) => {
        const profiles = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles
        const groups = Array.isArray(v.facebook_groups) ? v.facebook_groups[0] : v.facebook_groups
        
        // Get primary territory from profile_territories
        const profileTerritories = profiles?.profile_territories || []
        const primaryTerritory = Array.isArray(profileTerritories) && profileTerritories.length > 0
          ? profileTerritories[0]?.territories
          : null
        
        return {
          id: v.id,
          created_at: v.created_at,
          scheduled_for: v.scheduled_for,
          status: v.status,
          generated_content: v.generated_content,
          salesperson_email: profiles?.email || '',
          salesperson_name: profiles?.full_name || profiles?.email || 'Unknown',
          salesperson_territory: primaryTerritory ? 
            (Array.isArray(primaryTerritory) ? primaryTerritory[0]?.name : (primaryTerritory as { name: string })?.name) : null,
          group_name: groups?.name || 'Unknown',
          group_territory: groups?.territories ?
            (Array.isArray(groups.territories) ? groups.territories[0]?.name : (groups.territories as { name: string })?.name) : null
        }
      })

      setViolations(normalizedViolations)
      setFilteredViolations(normalizedViolations)
      calculateStats(normalizedViolations)
    } catch (err) {
      console.error('Error fetching violations:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: Violation[]) => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const stats: Stats = {
      totalViolations: data.length,
      byTerritory: {},
      bySalesperson: {},
      thisMonth: 0
    }

    data.forEach(v => {
      const territory = v.salesperson_territory || 'Unassigned'
      stats.byTerritory[territory] = (stats.byTerritory[territory] || 0) + 1

      stats.bySalesperson[v.salesperson_name] = (stats.bySalesperson[v.salesperson_name] || 0) + 1

      if (new Date(v.created_at) >= thisMonth) {
        stats.thisMonth++
      }
    })

    setStats(stats)
  }

  useEffect(() => {
    fetchViolations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let filtered = [...violations]

    if (filterSalesperson) {
      filtered = filtered.filter(v => 
        v.salesperson_name.toLowerCase().includes(filterSalesperson.toLowerCase()) ||
        v.salesperson_email.toLowerCase().includes(filterSalesperson.toLowerCase())
      )
    }

    if (filterTerritory) {
      filtered = filtered.filter(v => 
        v.salesperson_territory?.toLowerCase().includes(filterTerritory.toLowerCase())
      )
    }

    if (filterDateFrom) {
      filtered = filtered.filter(v => new Date(v.created_at) >= new Date(filterDateFrom))
    }

    if (filterDateTo) {
      const dateTo = new Date(filterDateTo)
      dateTo.setHours(23, 59, 59, 999)
      filtered = filtered.filter(v => new Date(v.created_at) <= dateTo)
    }

    setFilteredViolations(filtered)
  }, [filterSalesperson, filterTerritory, filterDateFrom, filterDateTo, violations])

  const exportToCSV = () => {
    const headers = ['Date', 'Salesperson', 'Salesperson Territory', 'Group Name', 'Group Territory', 'Status', 'Scheduled For']
    const rows = filteredViolations.map(v => [
      new Date(v.created_at).toLocaleDateString(),
      v.salesperson_name,
      v.salesperson_territory || 'N/A',
      v.group_name,
      v.group_territory || 'N/A',
      v.status,
      new Date(v.scheduled_for).toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `territory-violations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setFilterSalesperson('')
    setFilterTerritory('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading violations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Territory Violations</h1>
          <p className="text-gray-600 mt-1">Monitor and track territory policy violations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button onClick={exportToCSV} disabled={filteredViolations.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-3xl font-bold text-orange-600">{stats.totalViolations}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-blue-600">{stats.thisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Salespeople</p>
                <p className="text-3xl font-bold text-purple-600">{Object.keys(stats.bySalesperson).length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Territories Affected</p>
                <p className="text-3xl font-bold text-green-600">{Object.keys(stats.byTerritory).length}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter violations by salesperson, territory, or date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Salesperson</label>
                <input
                  type="text"
                  value={filterSalesperson}
                  onChange={(e) => setFilterSalesperson(e.target.value)}
                  placeholder="Name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Territory</label>
                <input
                  type="text"
                  value={filterTerritory}
                  onChange={(e) => setFilterTerritory(e.target.value)}
                  placeholder="Territory name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {(filterSalesperson || filterTerritory || filterDateFrom || filterDateTo) && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredViolations.length} of {violations.length} violations
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filteredViolations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Violations Found</h3>
            <p className="text-gray-600">
              {violations.length === 0 
                ? "No territory violations have been recorded yet."
                : "No violations match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredViolations.map((violation) => (
            <Card key={violation.id} className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{violation.salesperson_name}</h3>
                      <p className="text-sm text-gray-600">{violation.salesperson_email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(violation.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(violation.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-blue-900 mb-1">Salesperson Territory</p>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {violation.salesperson_territory || 'Not Assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-orange-900 mb-1">Posted to Group</p>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-700">{violation.group_name}</p>
                        <p className="text-xs text-orange-600">
                          Territory: {violation.group_territory || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Post Content Preview</p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {violation.generated_content}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Status: <span className="font-medium capitalize">{violation.status}</span></span>
                    <span>Scheduled: {new Date(violation.scheduled_for).toLocaleDateString()}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Violation Acknowledged
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {Object.keys(stats.bySalesperson).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Frequent Violators</CardTitle>
            <CardDescription>Salespeople with the most territory violations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.bySalesperson)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{name}</span>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      {count} violation{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}