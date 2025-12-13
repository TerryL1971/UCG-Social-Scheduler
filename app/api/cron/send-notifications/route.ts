// app/api/cron/send-notifications/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    
    // Verify this is being called from a cron job (optional security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }

    const supabase = await createServerSupabaseClient()

    // Get current time and time 15 minutes from now
    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)

    // Find posts scheduled within the next 15 minutes that haven't been notified yet
    const { data: postsToNotify, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', fifteenMinutesFromNow.toISOString())

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`Found ${postsToNotify?.length || 0} posts to notify`)

    if (!postsToNotify || postsToNotify.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No posts need notifications',
        count: 0 
      })
    }

    // Send notification for each post
    const results = []
    for (const post of postsToNotify) {
      try {
        // Call the send notification endpoint
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id }),
        })

        const result = await response.json()
        results.push({
          postId: post.id,
          success: response.ok,
          result,
        })

        console.log(`Notification sent for post ${post.id}:`, result)
      } catch (err) {
        console.error(`Failed to send notification for post ${post.id}:`, err)
        results.push({
          postId: post.id,
          success: false,
          error: err,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${postsToNotify.length} notifications`,
      count: postsToNotify.length,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow this endpoint to be called without authentication in development
export async function POST(request: NextRequest) {
  return GET(request)
}