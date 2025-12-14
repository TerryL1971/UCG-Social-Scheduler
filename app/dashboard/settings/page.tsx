// app/dashboard/settings/page.tsx

'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Bell, User, Save, CheckCircle } from 'lucide-react'

const AVAILABLE_ROLES = [
  { value: 'salesperson', label: 'Salesperson' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'marketer', label: 'Marketer' },
]

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
}

type NotificationSettings = {
  email_enabled: boolean
  notification_lead_time: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_enabled: false,
    notification_lead_time: 15,
    quiet_hours_start: null,
    quiet_hours_end: null
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
        return
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Fetch notification settings
      const { data: settingsData } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsData) {
        setNotificationSettings({
          email_enabled: settingsData.email_enabled ?? false,
          notification_lead_time: settingsData.notification_lead_time ?? 15,
          quiet_hours_start: settingsData.quiet_hours_start ?? null,
          quiet_hours_end: settingsData.quiet_hours_end ?? null
        })
      }

      setLoading(false)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!profile) return
    
    setSaving(true)
    setSaved(false)

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    // Upsert notification settings (insert if doesn't exist, update if it does)
    const { error: settingsError } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: profile.id,
        email_enabled: notificationSettings.email_enabled,
        notification_lead_time: notificationSettings.notification_lead_time,
        quiet_hours_start: notificationSettings.quiet_hours_start,
        quiet_hours_end: notificationSettings.quiet_hours_end
      }, {
        onConflict: 'user_id'
      })

    if (profileError || settingsError) {
      console.error('Profile error:', profileError)
      console.error('Settings error:', settingsError)
      alert('Failed to save settings: ' + (profileError?.message || settingsError?.message))
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading...</div>
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-96">Profile not found</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select your role in the organization
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Email Notifications</p>
              <p className="text-sm text-gray-600">
                Receive email reminders about upcoming scheduled posts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.email_enabled}
                onChange={(e) => setNotificationSettings({
                  ...notificationSettings,
                  email_enabled: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {notificationSettings.email_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Lead Time
                </label>
                <select
                  value={notificationSettings.notification_lead_time}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    notification_lead_time: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="120">2 hours before</option>
                  <option value="1440">1 day before</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance should we notify you?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiet Hours (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Start Time</label>
                    <Input
                      type="time"
                      value={notificationSettings.quiet_hours_start || ''}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        quiet_hours_start: e.target.value || null
                      })}
                      placeholder="22:00"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">End Time</label>
                    <Input
                      type="time"
                      value={notificationSettings.quiet_hours_end || ''}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        quiet_hours_end: e.target.value || null
                      })}
                      placeholder="08:00"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Don&apos;t send notifications during these hours
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-32"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        {saved && (
          <p className="text-sm text-green-600">
            Your settings have been saved successfully
          </p>
        )}
      </div>
    </div>
  )
}