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
  group_url?: string
}

interface Profile {
  full_name: string
  email: string
}

interface ScheduledPost {
  id: string
  generated_content: string
  scheduled_for: string
  status: string
  reminder_sent: boolean | null
  user_id: string
  facebook_groups: FacebookGroup | null
  profiles: Profile | null
}

export async function GET(request: Request) {
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current time and 2 hours from now
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    console.log(`⏰ Checking for posts between ${now.toISOString()} and ${twoHoursFromNow.toISOString()}`)

    // Find posts scheduled in the next 2 hours that haven't been reminded
    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        generated_content,
        scheduled_for,
        status,
        reminder_sent,
        user_id,
        facebook_groups!inner(name, group_url),
        profiles!inner(full_name, email)
      `)
      .in('status', ['ready', 'pending'])
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', twoHoursFromNow.toISOString())
      .or('reminder_sent.is.null,reminder_sent.eq.false')

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log(`📧 Found ${posts?.length || 0} posts needing reminders`)

    if (!posts || posts.length === 0) {
      return NextResponse.json({ 
        message: 'No posts need reminders',
        count: 0,
        timestamp: new Date().toISOString()
      })
    }

    const emailPromises = posts.map(async (post) => {
      const typedPost = post as unknown as ScheduledPost
      
      if (!typedPost.profiles?.email) {
        console.log(`⚠️ No email found for user ${typedPost.user_id}`)
        return null
      }

      const group = typedPost.facebook_groups
      const scheduledTime = new Date(typedPost.scheduled_for)
      const formattedTime = scheduledTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      })

      // Calculate time until post
      const minutesUntil = Math.round((scheduledTime.getTime() - now.getTime()) / (60 * 1000))
      const hoursUntil = Math.round(minutesUntil / 60)

      let timeUntilText = ''
      if (hoursUntil >= 2) {
        timeUntilText = `in ${hoursUntil} hours`
      } else if (minutesUntil >= 60) {
        timeUntilText = 'in about 1 hour'
      } else if (minutesUntil > 30) {
        timeUntilText = 'in 30-60 minutes'
      } else {
        timeUntilText = `in about ${minutesUntil} minutes`
      }

      try {
        console.log(`📨 Sending email to ${typedPost.profiles.email} for post ${typedPost.id}`)

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'UCG Social Scheduler <onboarding@resend.dev>',
          to: typedPost.profiles.email,
          subject: `⏰ Time to Post! - ${group?.name || 'your group'}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time to Post!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                ⏰ Time to Post!
              </h1>
              <p style="margin: 10px 0 0 0; color: #fee2e2; font-size: 16px; text-align: center;">
                Your scheduled post is ready
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${typedPost.profiles.full_name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your scheduled Facebook post is coming up <strong>${timeUntilText}</strong>!
              </p>

              <!-- Post Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                      📅 Scheduled For
                    </p>
                    <p style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: bold;">
                      ${formattedTime}
                    </p>

                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                      👥 Facebook Group
                    </p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">
                      ${group?.name || 'Unknown Group'}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  📝 How to Post:
                </p>
                <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
                  <li style="margin-bottom: 8px;">Copy the post content below</li>
                  <li style="margin-bottom: 8px;">Go to the Facebook group</li>
                  <li style="margin-bottom: 8px;">Paste and publish!</li>
                </ol>
              </div>

              <!-- Post Content -->
              <p style="margin: 30px 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                📄 Your Post Content (Ready to Copy!)
              </p>
              
              <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 10px 0 20px 0;">
                <pre style="margin: 0; color: #111827; font-size: 14px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${typedPost.generated_content}</pre>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${group?.group_url 
                      ? `<a href="${group.group_url}" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Go to Facebook Group →
                        </a>`
                      : `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ucg-social-scheduler.com'}/dashboard/posts" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View All Posts →
                        </a>`
                    }
                  </td>
                </tr>
              </table>

              <!-- Footer Note -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                  <strong>💡 Pro Tip:</strong> Select all the text in the box above (Cmd+A or Ctrl+A), copy it (Cmd+C or Ctrl+C), then paste it directly into Facebook!
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.6;">
                This is an automated reminder from UCG Social Scheduler<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ucg-social-scheduler.com'}" style="color: #dc2626; text-decoration: none;">ucg-social-scheduler.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
        return { success: true, postId: typedPost.id, email: typedPost.profiles.email }
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