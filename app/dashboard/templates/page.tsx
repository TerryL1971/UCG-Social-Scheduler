// app/dashboard/templates/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Share2, CheckCircle, Search, FileText, Globe } from 'lucide-react'

interface Template {
  id: string
  title: string
  content: string
  category: string
  tone: string
  target_audience: string
  is_shared_with_dealership: boolean
  is_system_template: boolean
  is_approved: boolean
  user_id: string
  created_at: string
}

const CATEGORIES = [
  'All',
  'promotion',
  'event',
  'announcement',
  'new_inventory',
  'sale',
  'service_special',
  'community',
  'general'
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ad_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
    } else {
      setTemplates(data || [])
    }
    setLoading(false)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    const { error } = await supabase
      .from('ad_templates')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to delete template')
    } else {
      fetchTemplates()
    }
  }

  const toggleShare = async (template: Template) => {
    const { error } = await supabase
      .from('ad_templates')
      .update({ 
        is_shared_with_dealership: !template.is_shared_with_dealership 
      })
      .eq('id', template.id)

    if (error) {
      alert('Failed to update sharing settings')
    } else {
      fetchTemplates()
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const replaceVariables = (content: string, preview = true) => {
    if (!preview) return content
    
    return content
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{day}/g, new Date().toLocaleDateString('en-US', { weekday: 'long' }))
      .replace(/{group_name}/g, '[Group Name]')
      .replace(/{dealership_name}/g, '[Your Dealership]')
      .replace(/{territory_name}/g, '[Territory]')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage reusable post templates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap"
                >
                  {cat.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">Create your first template to get started</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                        {template.category || 'general'}
                      </span>
                      {template.is_system_template && (
                        <div title="System Template">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      {template.is_shared_with_dealership && (
                        <div title="Shared with Dealership">
                          <Share2 className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      {template.is_approved && (
                        <div title="Approved">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {replaceVariables(template.content, true).substring(0, 150)}
                    {template.content.length > 150 ? '...' : ''}
                  </p>
                </div>

                {template.tone && (
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Tone:</strong> {template.tone}
                  </p>
                )}

                {template.target_audience && (
                  <p className="text-xs text-gray-600 mb-4">
                    <strong>Audience:</strong> {template.target_audience}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleShare(template)}
                    className={template.is_shared_with_dealership ? 'border-green-500 text-green-700' : ''}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    {template.is_shared_with_dealership ? 'Unshare' : 'Share'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchTemplates()
          }}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

function CreateTemplateModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [tone, setTone] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showAiInput, setShowAiInput] = useState(true)

  const supabase = createClient()

  useEffect(() => {
     
    setMounted(true)
    console.log('Create Modal mounted')
    console.log('document.body:', document.body)
    return () => console.log('Create Modal unmounted')
    // This is intentional - we need to wait for client-side mounting before using createPortal
  }, [])

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a description for your template')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a reusable social media post template for a car dealership. ${aiPrompt}
          
          Include these variable placeholders in the content where appropriate:
          - {dealership_name} for the dealership name
          - {territory_name} for the territory/city
          - {date} for current date
          - {day} for day of week
          - {group_name} for the Facebook group name
          
          Make it professional, engaging, and include relevant emojis.`
        })
      })

      const data = await response.json()

      if (response.ok && data.content) {
        setContent(data.content)
        setTitle(aiPrompt.substring(0, 50))
        setShowAiInput(false)
        
        // Try to auto-detect category from prompt
        const promptLower = aiPrompt.toLowerCase()
        if (promptLower.includes('sale') || promptLower.includes('discount')) setCategory('sale')
        else if (promptLower.includes('event')) setCategory('event')
        else if (promptLower.includes('service')) setCategory('service_special')
        else if (promptLower.includes('new') || promptLower.includes('inventory')) setCategory('new_inventory')
        else if (promptLower.includes('announcement')) setCategory('announcement')
        else if (promptLower.includes('community')) setCategory('community')
        else if (promptLower.includes('promotion')) setCategory('promotion')
      } else {
        alert('Failed to generate template. Please try again.')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Failed to generate template')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!title || !content) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('You must be logged in')
      setSaving(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('ad_templates')
      .insert({
        user_id: user.id,
        dealership_id: profile?.dealership_id,
        title,
        content,
        category,
        tone,
        target_audience: targetAudience
      })

    setSaving(false)

    if (error) {
      console.error('Error creating template:', error)
      alert('Failed to create template')
    } else {
      onSuccess()
    }
  }

  if (!mounted) return null

  const modalContent = (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 z-9999 overflow-y-auto bg-black bg-opacity-50"
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflowY: 'auto'
      }}
      onClick={(e) => {
        console.log('Overlay clicked')
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-screen items-center justify-center p-4 py-12">
        <div 
          className="w-full max-w-2xl bg-white rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Template</h2>
            
            {showAiInput ? (
              <div className="space-y-4">
                <div className="bg-linear-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    ✨ AI Template Generator
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Describe what kind of template you need, and AI will create it for you with proper formatting and variable placeholders.
                  </p>
                  
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Example: Create a template for announcing weekend sales with special financing offers"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-24 mb-3"
                    disabled={generating}
                  />
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={generateWithAI} 
                      disabled={generating}
                      className="flex-1"
                    >
                      {generating ? 'Generating...' : '✨ Generate Template'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAiInput(false)}
                      disabled={generating}
                    >
                      Create Manually
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Manually creating template</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAiInput(true)}
                  >
                    ✨ Use AI Instead
                  </Button>
                </div>
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekend Sale Announcement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Template content... Use {date}, {day}, {group_name}, {dealership_name}, {territory_name}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-48"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Available variables: {'{date}'}, {'{day}'}, {'{group_name}'}, {'{dealership_name}'}, {'{territory_name}'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <Input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g., Professional, Casual"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Audience</label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., First-time buyers"
                  />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {!showAiInput && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Template'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function EditTemplateModal({ template, onClose, onSuccess }: { 
  template: Template
  onClose: () => void
  onSuccess: () => void 
}) {
  const [title, setTitle] = useState(template.title)
  const [content, setContent] = useState(template.content)
  const [category, setCategory] = useState(template.category || 'general')
  const [tone, setTone] = useState(template.tone || '')
  const [targetAudience, setTargetAudience] = useState(template.target_audience || '')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    console.log('Edit Modal mounted')
    // This is intentional - we need to wait for client-side mounting before using createPortal
  }, [])

  const handleSave = async () => {
    setSaving(true)

    const { error } = await supabase
      .from('ad_templates')
      .update({
        title,
        content,
        category,
        tone,
        target_audience: targetAudience,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id)

    setSaving(false)

    if (error) {
      console.error('Error updating template:', error)
      alert('Failed to update template')
    } else {
      onSuccess()
    }
  }

  if (!mounted) return null

  const modalContent = (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 z-9999 overflow-y-auto bg-black bg-opacity-50"
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-screen items-center justify-center p-4 py-12">
        <div 
          className="w-full max-w-2xl bg-white rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Edit Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-48"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <Input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Audience</label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}