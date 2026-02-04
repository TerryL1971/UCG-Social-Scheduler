// app/dashboard/settings/page.tsx - FIXED

'use client'

import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Bell, Mail, User, Save, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (newPassword.length < 8) {
      toast.warning('New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.warning('New passwords do not match')
      return
    }

    if (!confirm('Change your password? You will need to log in again.')) {
      return
    }

    setChangingPassword(true)

    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user found')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success('Password changed successfully!', {
        description: 'Please log in with your new password'
      })

      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Sign out and redirect to login
      await supabase.auth.signOut()
      router.push('/login')

    } catch (err) {
      const error = err as Error
      toast.error('Failed to change password', {
        description: error.message
      })
    } finally {
      setChangingPassword(false)
    }
  }

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

      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
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
        toast.error('Failed to send test email', {
          description: data.error || 'Unknown error'
        })
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error('Failed to send test email', {
        description: 'Check console for details'
      })
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

      {/* Profile Information */}
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

      {/* Email Notifications */}
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
                      variant="secondary"
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

      {/* Change Password Section - THIS IS WHERE IT GOES! */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  disabled={changingPassword}
                  className="w-full px-4 py-3 pr-12 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  required
                  minLength={8}
                  disabled={changingPassword}
                  className="w-full px-4 py-3 pr-12 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  disabled={changingPassword}
                  className="w-full px-4 py-3 pr-12 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                    • At least 8 characters {newPassword.length >= 8 && '✓'}
                  </li>
                  <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                    • Passwords match {newPassword === confirmPassword && newPassword && '✓'}
                  </li>
                </ul>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> After changing your password, you will be logged out and need to sign in again with your new password.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 min-h-[44px] px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Save Settings Button */}
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

      {/* Info Card */}
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