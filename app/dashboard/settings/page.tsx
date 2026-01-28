// app/dashboard/settings/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Bell, Mail, User, Save, CheckCircle, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setFullName((user.user_metadata?.full_name as string) || '')
        setEmailNotifications(user.user_metadata?.email_notifications !== false)
      }
      setLoading(false)
    }
    loadUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          email_notifications: emailNotifications
        }
      })

      if (error) throw error

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    setEmailSent(false)
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 5000)
      } else {
        alert(`Failed to send test email: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Test email error:', error)
      alert('Failed to send test email. Check console for details.')
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and notification preferences</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-6">
            <Bell className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                id="emailNotifications"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <label 
                  htmlFor="emailNotifications" 
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Send me email reminders for scheduled posts
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  You will receive an email 1 hour before your scheduled post time
                </p>
              </div>
            </div>

            {emailNotifications && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Email notifications are enabled
                    </p>
                    <p className="text-xs text-green-700 mb-3">
                      Test your email setup to make sure notifications are working correctly.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleTestEmail}
                      disabled={testingEmail || emailSent}
                      variant="outline"
                      className="bg-white hover:bg-green-50 border-green-300"
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : emailSent ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Email Sent! Check Your Inbox
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How email notifications work:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Notifications are sent 1 hour before your scheduled post time</li>
                <li>You will receive a reminder with the post content and group name</li>
                <li>Each post only sends one reminder email</li>
                <li>Make sure to check your spam folder if you do not see the email</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}