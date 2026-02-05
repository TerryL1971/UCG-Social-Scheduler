// app/dashboard/credits/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Zap,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

type CreditData = {
  balance: number
  total_purchased: number
  total_spent: number
  low_balance_threshold: number
}

type Transaction = {
  id: string
  transaction_type: string
  amount: number
  balance_after: number
  description: string
  created_at: string
  metadata: any
}

type Usage = {
  id: string
  endpoint: string
  tokens_used: number
  estimated_cost: number
  test_mode: boolean
  created_at: string
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [usage, setUsage] = useState<Usage[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load credit balance
      const { data: creditData, error: creditError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (creditError && creditError.code !== 'PGRST116') {
        console.error('Credit error:', creditError)
      }

      setCredits(creditData)

      // Load recent transactions
      const { data: transactionData } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setTransactions(transactionData || [])

      // Load API usage stats
      const { data: usageData } = await supabase
        .from('api_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setUsage(usageData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  const handleAddManualCredits = async () => {
    const amount = prompt('Enter amount in euros (for testing only):')
    if (!amount) return

    const euros = parseFloat(amount)
    if (isNaN(euros) || euros <= 0) {
      toast.error('Invalid amount')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: currentCredits } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      const newBalance = (currentCredits?.balance || 0) + euros

      await supabase
        .from('credits')
        .update({
          balance: newBalance,
          total_purchased: (currentCredits?.balance || 0) + euros
        })
        .eq('user_id', user.id)

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'purchase',
          amount: euros,
          balance_after: newBalance,
          description: 'Manual credit addition (testing)',
          payment_method: 'manual'
        })

      toast.success(`Added €${euros.toFixed(2)} credits`)
      loadData()
    } catch (error) {
      console.error('Error adding credits:', error)
      toast.error('Failed to add credits')
    }
  }

  // Calculate stats
  const todayUsage = usage.filter(u => 
    new Date(u.created_at).toDateString() === new Date().toDateString() &&
    !u.test_mode
  )
  
  const thisWeekUsage = usage.filter(u => {
    const usageDate = new Date(u.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return usageDate >= weekAgo && !u.test_mode
  })

  const estimatedGenerationsRemaining = credits?.balance 
    ? Math.floor(credits.balance / 0.006) // Average cost per generation
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credits & Usage</h1>
          <p className="text-gray-600 mt-1">Monitor your AI generation credits and usage</p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <Button onClick={handleAddManualCredits} variant="secondary">
            Add Test Credits
          </Button>
        )}
      </div>

      {/* Current Balance Card */}
      <Card className={`border-l-4 ${
        (credits?.balance || 0) < 1 
          ? 'bg-red-50 border-l-red-500' 
          : (credits?.balance || 0) < 5 
            ? 'bg-yellow-50 border-l-yellow-500'
            : 'bg-green-50 border-l-green-500'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Current Balance</p>
              <p className="text-5xl font-bold text-gray-900">
                €{credits?.balance.toFixed(2) || '0.0000'}
              </p>
              <p className="text-sm text-gray-600 mt-3">
                ≈ <strong>{estimatedGenerationsRemaining}</strong> AI generations remaining
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on average cost of €0.006 per generation
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <CreditCard className="w-20 h-20 text-gray-400" />
              {(credits?.balance || 0) < 1 && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Buy Credits
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Balance Warning */}
      {credits && credits.balance < 5 && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">Low Credit Balance</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Your balance is below €5.00. Consider purchasing more credits to avoid interruptions.
                </p>
                <Button size="sm" className="mt-3 bg-yellow-600 hover:bg-yellow-700">
                  Purchase Credits
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchased</p>
                <p className="text-2xl font-bold">€{credits?.total_purchased.toFixed(2) || '0.00'}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold">€{credits?.total_spent.toFixed(2) || '0.0000'}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold">{todayUsage.length}</p>
                <p className="text-xs text-gray-500">generations</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">{thisWeekUsage.length}</p>
                <p className="text-xs text-gray-500">generations</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Options - TODO: Integrate with Stripe */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <p className="text-sm text-gray-600">Get more AI generation credits</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-gray-50 transition-all text-left">
              <p className="text-3xl font-bold">€10</p>
              <p className="text-sm text-gray-600 mt-2">≈1,600 generations</p>
              <p className="text-xs text-gray-500 mt-1">Best for individuals</p>
              <div className="mt-4 text-sm font-semibold text-green-600">
                €0.0062 per generation
              </div>
            </button>

            <button className="p-6 border-2 border-green-500 rounded-lg bg-green-50 text-left relative">
              <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                POPULAR
              </div>
              <p className="text-3xl font-bold">€50</p>
              <p className="text-sm text-gray-600 mt-2">≈8,300 generations</p>
              <p className="text-xs text-gray-500 mt-1">Best for teams</p>
              <div className="mt-4 text-sm font-semibold text-green-600">
                €0.0060 per generation
              </div>
            </button>

            <button className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-gray-50 transition-all text-left">
              <p className="text-3xl font-bold">€100</p>
              <p className="text-sm text-gray-600 mt-2">≈16,600 generations</p>
              <p className="text-xs text-gray-500 mt-1">Best for dealerships</p>
              <div className="mt-4 text-sm font-semibold text-green-600">
                €0.0060 per generation
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>Need more?</strong> Contact us for enterprise pricing with volume discounts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    {tx.transaction_type === 'usage' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : tx.transaction_type === 'purchase' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium capitalize">
                        {tx.transaction_type === 'usage' ? 'AI Generation' : tx.transaction_type}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-gray-500 mt-1">{tx.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Balance: €{tx.balance_after.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Usage Details */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No API usage yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Date/Time</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Tokens</th>
                    <th className="text-right p-3">Cost</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {u.test_mode ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            TEST MODE
                          </span>
                        ) : (
                          <span className="capitalize">{u.endpoint.replace('_', ' ')}</span>
                        )}
                      </td>
                      <td className="text-right p-3">
                        {u.tokens_used.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        {u.test_mode ? (
                          <span className="text-gray-400">€0.0000</span>
                        ) : (
                          `€${u.estimated_cost.toFixed(4)}`
                        )}
                      </td>
                      <td className="text-center p-3">
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}