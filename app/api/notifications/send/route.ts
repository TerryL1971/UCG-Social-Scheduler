// app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { scheduleId } = await request.json()

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Get the scheduled post with user and group info
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('post_schedules')
      .select(`
        id,
        scheduled_for,
        status,
        post_type,
        generated_content,
        target_audience,
        special_context,
        user_id,
        facebook_groups!inner(
          name,
          group_url,
          territories(name)
        )
      `)
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      console.error('Schedule not found:', scheduleError)
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', schedule.user_id)
      .single()

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Extract group data (Supabase returns arrays for joins)
    const group = Array.isArray(schedule.facebook_groups) 
      ? schedule.facebook_groups[0] 
      : schedule.facebook_groups

    const userEmail = profile.email
    const userName = profile.full_name || 'there'
    const groupName = group.name || 'Unknown Group'
    const scheduledTime = new Date(schedule.scheduled_for)
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
    const now = new Date()
    const minutesUntil = Math.round((scheduledTime.getTime() - now.getTime()) / (60 * 1000))
    const hoursUntil = Math.round(minutesUntil / 60)

    let timeUntilText = ''
    if (scheduledTime < now) {
      timeUntilText = 'now (overdue)'
    } else if (hoursUntil >= 24) {
      timeUntilText = `in ${Math.round(hoursUntil / 24)} days`
    } else if (hoursUntil >= 2) {
      timeUntilText = `in ${hoursUntil} hours`
    } else if (minutesUntil >= 60) {
      timeUntilText = 'in about 1 hour'
    } else if (minutesUntil > 30) {
      timeUntilText = 'in 30-60 minutes'
    } else if (minutesUntil > 0) {
      timeUntilText = `in about ${minutesUntil} minutes`
    } else {
      timeUntilText = 'now'
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    if (!schedule.generated_content) {
      return NextResponse.json({ 
        error: 'No content generated yet. Please regenerate content first.' 
      }, { status: 400 })
    }

    console.log(`📨 Sending manual reminder to ${userEmail} for schedule ${scheduleId}`)

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'UCG Social Scheduler <onboarding@resend.dev>',
      to: userEmail,
      subject: `⏰ Time to Post! - ${groupName}`,
      html: generateEmailHTML(
        userName,
        groupName,
        group.group_url,
        schedule.generated_content,
        formattedTime,
        timeUntilText,
        schedule.post_type
      )
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', details: emailError }, { status: 500 })
    }

    // Mark reminder as sent
    await supabaseAdmin
      .from('post_schedules')
      .update({ 
        reminder_sent: true,
        reminder_sent_at: new Date().toISOString()
      })
      .eq('id', scheduleId)

    console.log(`✅ Manual reminder sent successfully for schedule ${scheduleId}`)

    return NextResponse.json({ 
      success: true, 
      emailId: emailData?.id,
      message: 'Reminder email sent successfully!'
    })

  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Generate email HTML
function generateEmailHTML(
  userName: string,
  groupName: string,
  groupUrl: string | undefined,
  content: string,
  formattedTime: string,
  timeUntilText: string,
  postType: string
): string {
  return `
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
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                ⏰ Time to Post!
              </h1>
              <p style="margin: 10px 0 0 0; color: #fee2e2; font-size: 16px; text-align: center;">
                Your content is ready to go
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${userName}</strong>,
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
                    <p style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      ${groupName}
                    </p>

                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                      📝 Post Type
                    </p>
                    <p style="margin: 0; color: #111827; font-size: 14px;">
                      ${postType.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                  <li style="margin-bottom: 8px;">Copy the post content below (click to select all)</li>
                  <li style="margin-bottom: 8px;">Go to the Facebook group using the button</li>
                  <li style="margin-bottom: 8px;">Paste and publish!</li>
                  <li>Return to dashboard to mark as posted</li>
                </ol>
              </div>

              <!-- Post Content -->
              <p style="margin: 30px 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                📄 Your Post Content (Click to Select All)
              </p>
              
              <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 10px 0 20px 0; cursor: text;">
                <pre style="margin: 0; color: #111827; font-size: 14px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${content}</pre>
              </div>

              <!-- CTA Buttons -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${groupUrl 
                      ? `<a href="${groupUrl}" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 5px;">
                          🚀 Go to Facebook Group
                        </a>`
                      : ''
                    }
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ucg-social-scheduler.com'}/dashboard/posts" style="display: inline-block; padding: 16px 32px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 5px;">
                      📊 View Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">
                  <strong>💡 Pro Tip:</strong> After posting to Facebook, return to your dashboard and click "Mark as Posted" to track your posting history!
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.6;">
                UCG Social Scheduler - Automated Post Management<br>
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
}