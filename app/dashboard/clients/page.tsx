// app/dashboard/clients/page.tsx

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Globe, 
  Facebook, 
  Instagram,
  Building2,
  X,
  Save,
  Handshake,
} from 'lucide-react'

type Tone = 'professional' | 'friendly' | 'fun' | 'informative'

type Client = {
  id: string
  user_id: string
  business_name: string
  description: string
  industry: string | null
  website_url: string | null
  facebook_handle: string | null
  instagram_handle: string | null
  tone: Tone
  logo_url: string | null
  partnership_notes: string | null
  is_active: boolean
  created_at: string
}

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable and conversational' },
  { value: 'fun', label: 'Fun', description: 'Playful, energetic and entertaining' },
  { value: 'informative', label: 'Informative', description: 'Educational and detail-oriented' },
]

const INDUSTRY_OPTIONS = [
  'Automotive', 'Beauty & Wellness', 'Business Services', 'Education',
  'Entertainment', 'Fashion & Retail', 'Food & Beverage', 'Health & Fitness',
  'Home & Garden', 'Hospitality & Travel', 'Legal & Financial', 'Marketing',
  'Real Estate', 'Technology', 'Other',
]

const emptyForm = {
  business_name: '',
  description: '',
  industry: '',
  website_url: '',
  facebook_handle: '',
  instagram_handle: '',
  tone: 'friendly' as Tone,
  logo_url: '',
  partnership_notes: '',
}

export default function ClientsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('business_name')

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAddModal = () => {
    setEditingClient(null)
    setForm(emptyForm)
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setForm({
      business_name: client.business_name,
      description: client.description,
      industry: client.industry || '',
      website_url: client.website_url || '',
      facebook_handle: client.facebook_handle || '',
      instagram_handle: client.instagram_handle || '',
      tone: client.tone,
      logo_url: client.logo_url || '',
      partnership_notes: client.partnership_notes || '',
    })
    setError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      setError('Business name is required')
      return
    }
    if (!form.description.trim()) {
      setError('Business description is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        business_name: form.business_name.trim(),
        description: form.description.trim(),
        industry: form.industry || null,
        website_url: form.website_url || null,
        facebook_handle: form.facebook_handle || null,
        instagram_handle: form.instagram_handle || null,
        tone: form.tone,
        logo_url: form.logo_url || null,
        partnership_notes: form.partnership_notes || null,
        user_id: user.id,
      }

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingClient.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(payload)
        if (error) throw error
      }

      setShowModal(false)
      await fetchClients()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save client'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      setDeleteConfirm(null)
      await fetchClients()
    } catch (err) {
      console.error('Error deleting client:', err)
    }
  }

  const handleToggleActive = async (client: Client) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id)
      if (error) throw error
      await fetchClients()
    } catch (err) {
      console.error('Error toggling client:', err)
    }
  }

  const toneColors: Record<Tone, string> = {
    professional: 'bg-blue-100 text-blue-700',
    friendly: 'bg-green-100 text-green-700',
    fun: 'bg-yellow-100 text-yellow-700',
    informative: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ucg-section-header">
          <h1 className="text-2xl font-bold text-gray-900">Spotlight Partners</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your UCG partner businesses for social media promotion</p>
        </div>
        <button onClick={openAddModal} className="ucg-btn-primary">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ucg-card p-4">
          <p className="text-sm text-gray-500">Total Partners</p>
          <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
        </div>
        <div className="ucg-card p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600">{clients.filter(c => c.is_active).length}</p>
        </div>
        <div className="ucg-card p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-3xl font-bold text-gray-400">{clients.filter(c => !c.is_active).length}</p>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ucg-card p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="ucg-card p-12 text-center">
          <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No partners yet</h3>
          <p className="text-gray-500 mb-6">Add your first spotlight partner to start creating promotional posts.</p>
          <button onClick={openAddModal} className="ucg-btn-primary">
            <Plus className="w-4 h-4" />
            Add First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((client) => (
            <div key={client.id} className={`ucg-card p-5 ${!client.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {client.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.logo_url} alt={client.business_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{client.business_name}</h3>
                      {!client.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {client.industry && (
                      <p className="text-xs text-gray-500">{client.industry}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(client.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{client.description}</p>

              {client.partnership_notes && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-700"><span className="font-semibold">Partnership:</span> {client.partnership_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${toneColors[client.tone]}`}>
                    {client.tone.charAt(0).toUpperCase() + client.tone.slice(1)}
                  </span>
                  <div className="flex items-center gap-2">
                    {client.website_url && (
                      <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    {client.facebook_handle && (
                      <a href={`https://facebook.com/${client.facebook_handle}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {client.instagram_handle && (
                      <a href={`https://instagram.com/${client.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(client)}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                    client.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {client.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingClient ? 'Edit Partner' : 'Add Spotlight Partner'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder="e.g. Concierge Wiesbaden"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what this business does, who they serve, and what makes them special..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">This is what the AI uses to generate post content.</p>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setForm({ ...form, tone: tone.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        form.tone === tone.value
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900">{tone.label}</p>
                      <p className="text-xs text-gray-500">{tone.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Partnership Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partnership Notes</label>
                <textarea
                  value={form.partnership_notes}
                  onChange={(e) => setForm({ ...form, partnership_notes: e.target.value })}
                  placeholder="e.g. Concierge Wiesbaden helps American expats navigate life in Germany — a perfect partner for UCG customers relocating to Germany."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {/* URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />Website URL
                  </label>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Social Handles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Facebook className="w-4 h-4 inline mr-1 text-blue-600" />Facebook Handle
                  </label>
                  <div className="flex">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">@</span>
                    <input
                      type="text"
                      value={form.facebook_handle}
                      onChange={(e) => setForm({ ...form, facebook_handle: e.target.value })}
                      placeholder="pagehande"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Instagram className="w-4 h-4 inline mr-1 text-pink-600" />Instagram Handle
                  </label>
                  <div className="flex">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">@</span>
                    <input
                      type="text"
                      value={form.instagram_handle}
                      onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                      placeholder="handle"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="ucg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingClient ? 'Save Changes' : 'Add Partner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Partner?</h3>
            <p className="text-gray-600 text-sm mb-6">This will permanently delete this partner and all associated data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}