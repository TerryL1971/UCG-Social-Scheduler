// app/register/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import Link from 'next/link'
import Image from 'next/image'

type Dealership = {
  id: string
  name: string
  location: string | null
}

const POSITION_OPTIONS = [
  { value: 'salesperson', label: 'Salesperson' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' },
  { value: 'owner', label: 'Owner' },
]

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [dealershipId, setDealershipId] = useState('')
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchDealerships = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('dealerships')
          .select('id, name, location')
          .order('name')

        if (error) {
          console.error('Error fetching dealerships:', error)
          setError('Unable to load dealerships. Please contact support.')
        } else {
          setDealerships(data || [])
          if (data && data.length === 0) {
            setError('No dealerships available. Please contact support.')
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred. Please refresh the page.')
      }
    }

    fetchDealerships()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!dealershipId) {
      setError('Please select a dealership')
      return
    }

    if (!position) {
      setError('Please select a position')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Pass all profile data as user_metadata so the DB trigger can use it
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: position,
            dealership_id: dealershipId,
          }
        }
      })

      if (authError) throw authError

      // Show success message - user needs to confirm email
      setSuccess(true)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <Image
                src="/ucg-logo.png"
                alt="UCG Logo"
                width={240}
                height={240}
                priority
                className="object-contain"
                style={{ width: 'auto', height: '100px' }}
              />
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="text-gray-600">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
            </p>
            <p className="text-sm text-gray-500">
              Once confirmed, you can{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                sign in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Image
              src="/ucg-logo.png"
              alt="UCG Logo"
              width={240}
              height={240}
              priority
              className="object-contain"
              style={{ width: 'auto', height: '100px' }}
            />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Register for UCG Social Scheduler</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dealership" className="text-sm font-medium text-gray-700">
                Dealership
              </label>
              <select
                id="dealership"
                value={dealershipId}
                onChange={(e) => setDealershipId(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a dealership</option>
                {dealerships.map((dealership) => (
                  <option key={dealership.id} value={dealership.id}>
                    {dealership.name} {dealership.location && `- ${dealership.location}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium text-gray-700">
                Position
              </label>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your position</option>
                {POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}