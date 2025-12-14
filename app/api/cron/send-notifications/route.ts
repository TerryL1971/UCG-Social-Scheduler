// app/api/cron/send-notifications/route.ts

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Create a Supabase client with service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface FacebookGroup {
  name: string
}

interface ScheduledPost {
  id: string
  generated_content: string
  scheduled_for: string
  status: string
  reminder_sent: boolean | null
  user_id: string
  facebook_groups: FacebookGroup | null
}

export async function GET(request: Request) {
  try {
    // Verify the request is from your cron service (optional but recommended)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current time and 1 hour from now
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    console.log(`Checking for posts between ${now.toISOString()} and ${oneHourFromNow.toISOString()}`)

    // Find posts scheduled in the next hour that haven't been reminded
    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        generated_content,
        scheduled_for,
        status,
        reminder_sent,
        user_id,
        facebook_groups!inner(name)
      `)
      .in('status', ['ready', 'pending'])
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', oneHourFromNow.toISOString())
      .or('reminder_sent.is.null,reminder_sent.eq.false')

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log(`Found ${posts?.length || 0} posts needing reminders`)

    if (!posts || posts.length === 0) {
      return NextResponse.json({ 
        message: 'No posts need reminders',
        count: 0 
      })
    }

    // Get user emails
    const userIds = [...new Set(posts.map(p => p.user_id))]
    const { data: users } = await supabase.auth.admin.listUsers()
    
    const userEmails = new Map(
      users.users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, { 
          email: u.email || '', 
          name: (u.user_metadata?.full_name as string | undefined) || '' 
        }])
    )

    const emailPromises = posts.map(async (post) => {
      const userInfo = userEmails.get(post.user_id)
      
      if (!userInfo?.email) {
        console.log(`No email found for user ${post.user_id}`)
        return null
      }

      const typedPost = post as unknown as ScheduledPost
      const group = typedPost.facebook_groups
      const scheduledTime = new Date(typedPost.scheduled_for)
      const formattedTime = scheduledTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      try {
        console.log(`Sending email to ${userInfo.email} for post ${typedPost.id}`)

        await resend.emails.send({
          from: 'UCG Post Scheduler <onboarding@resend.dev>',
          to: userInfo.email,
          subject: `⏰ Reminder: Post scheduled for ${group?.name || 'your group'}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6; 
                    color: #1f2937; 
                    margin: 0;
                    padding: 0;
                    background-color: #f3f4f6;
                  }
                  .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: white;
                  }
                  .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 40px 30px; 
                    text-align: center; 
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                  }
                  .content { 
                    padding: 40px 30px; 
                  }
                  .post-box { 
                    background: #f9fafb; 
                    border-left: 4px solid #667eea; 
                    padding: 20px; 
                    margin: 25px 0; 
                    border-radius: 8px; 
                  }
                  .post-box p {
                    margin: 8px 0;
                  }
                  .post-box strong {
                    color: #374151;
                    font-weight: 600;
                  }
                  .content-preview {
                    background: white;
                    padding: 15px;
                    border-radius: 6px;
                    margin-top: 10px;
                    color: #6b7280;
                    white-space: pre-wrap;
                    font-size: 14px;
                    border: 1px solid #e5e7eb;
                  }
                  .button { 
                    display: inline-block; 
                    padding: 14px 28px; 
                    background: #667eea; 
                    color: white !important; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    margin-top: 20px;
                    font-weight: 600;
                    transition: background 0.2s;
                  }
                  .button:hover {
                    background: #5568d3;
                  }
                  .footer { 
                    text-align: center; 
                    color: #9ca3af; 
                    font-size: 13px; 
                    padding: 30px;
                    border-top: 1px solid #e5e7eb;
                  }
                  .reminder-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="reminder-icon">⏰</div>
                    <h1>Post Reminder</h1>
                  </div>
                  <div class="content">
                    <p style="font-size: 16px; margin-bottom: 10px;">Hi ${userInfo.name || 'there'}! 👋</p>
                    
                    <p style="color: #6b7280;">This is a friendly reminder that you have a post scheduled soon:</p>
                    
                    <div class="post-box">
                      <p><strong>📍 Facebook Group:</strong> ${group?.name || 'Unknown Group'}</p>
                      <p><strong>⏰ Scheduled Time:</strong> ${formattedTime}</p>
                      <p style="margin-top: 15px;"><strong>📝 Your Content:</strong></p>
                      <div class="content-preview">${typedPost.generated_content.substring(0, 300)}${typedPost.generated_content.length > 300 ? '...' : ''}</div>
                    </div>
                    
                    <p style="color: #374151; font-weight: 500;">Don&apos;t forget to post it at the scheduled time! 🎯</p>
                    
                    <center>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/posts" class="button">
                        📋 View All Scheduled Posts
                      </a>
                    </center>
                  </div>
                  <div class="footer">
                    <p>This is an automated reminder from UCG Social Scheduler</p>
                    <p style="margin-top: 10px;">You can manage your notification preferences in your dashboard settings.</p>
                  </div>
                </div>
              </body>
            </html>
          `
        })

        // Mark reminder as sent
        await supabase
          .from('scheduled_posts')
          .update({ reminder_sent: true })
          .eq('id', typedPost.id)

        console.log(`✅ Email sent successfully for post ${typedPost.id}`)
        return { success: true, postId: typedPost.id, email: userInfo.email }
      } catch (error) {
        console.error(`❌ Failed to send email for post ${typedPost.id}:`, error)
        return { success: false, postId: typedPost.id, error: String(error) }
      }
    })

    const results = await Promise.all(emailPromises)
    const validResults = results.filter(r => r !== null)
    const successCount = validResults.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} of ${validResults.length} reminder emails`,
      timestamp: new Date().toISOString(),
      details: {
        total: posts.length,
        sent: successCount,
        failed: validResults.length - successCount
      },
      results: validResults
    })

  } catch (error) {
    console.error('❌ Error in cron job:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process reminders',
        details: String(error) 
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for testing
export async function POST(request: Request) {
  return GET(request)
}

// Allow the route to run for up to 60 seconds
export const maxDuration = 60