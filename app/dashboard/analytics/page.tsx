import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager' && profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor team performance and posting activity</p>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
          <p className="text-gray-600">
            View detailed reports on posting activity, compliance, and team performance
          </p>
        </CardContent>
      </Card>
    </div>
  )
}