// app/dashboard/settings/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save } from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  email: string
  role: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    notification_lead_time: 15,
  })
  const supabase = createClient()

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data as Profile)
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        notification_lead_time: 15,
      })
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
      })
      .eq('id', user.id)

    if (error) {
      alert('Failed to save settings')
    } else {
      alert('Settings saved successfully!')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email (Read-only)</label>
            <Input value={formData.email} disabled />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Input value={profile?.role || ''} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Configure when you receive reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reminder Lead Time (minutes before post)</label>
            <Input
              type="number"
              value={formData.notification_lead_time}
              onChange={(e) => setFormData({ ...formData, notification_lead_time: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500">How many minutes before the scheduled time should we remind you?</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        <Save className="w-4 h-4 mr-2" />
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}