import { createBrowserClient } from '@supabase/ssr'

// Browser client (for client components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types for our database
export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'salesperson' | 'manager' | 'admin'
  dealership_id: string | null
  territory_ids: string[] | null
  created_at: string
  updated_at: string
}

export type Dealership = {
  id: string
  name: string
  location: string | null
  created_at: string
  updated_at: string
}

export type FacebookGroup = {
  id: string
  user_id: string
  name: string
  facebook_url: string | null
  description: string | null
  member_count: number | null
  territory_id: string | null
  posting_rules: {
    max_posts_per_week?: number
    best_time?: string
    notes?: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ScheduledPost = {
  id: string
  user_id: string
  group_id: string
  template_id: string | null
  generated_content: string
  scheduled_for: string
  status: 'pending' | 'ready' | 'posted' | 'skipped' | 'failed'
  posted_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}