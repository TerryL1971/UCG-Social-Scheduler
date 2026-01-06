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
  group_type?: string
  description?: string
  territories?: {
    name: string
  }
}

interface Profile {
  full_name: string
  email: string
  whatsapp?: string
}

interface VehicleData {
  make: string
  model: string
  year: string
  price?: string
  features?: string
  condition?: string
  mileage?: string
}

interface TestimonialData {
  customerName?: string
  vehicle: string
  experience?: string
  location?: string
}

interface PostSchedule {
  id: string
  scheduled_for: string
  status: string
  reminder_sent: boolean | null
  user_id: string
  post_type: string
  target_audience?: string
  special_context?: string
  vehicle_data?: VehicleData
  testimonial_data?: TestimonialData
  special_offer?: string
  generated_content?: string
  facebook_groups: FacebookGroup | null
  profiles: Profile | null
}

export async function GET(request: Request) {
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current time and 2 hours from now
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    console.log(`⏰ [${now.toISOString()}] Checking for schedules between ${now.toISOString()} and ${twoHoursFromNow.toISOString()}`)

    // Find schedules in the next 2 hours that haven't been reminded
    const { data: schedules, error } = await supabase
      .from('post_schedules')
      .select(`
        id,
        scheduled_for,
        status,
        reminder_sent,
        user_id,
        post_type,
        target_audience,
        special_context,
        vehicle_data,
        testimonial_data,
        special_offer,
        generated_content,
        facebook_groups!inner(name, group_url, group_type, description, territories(name))
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', twoHoursFromNow.toISOString())
      .or('reminder_sent.is.null,reminder_sent.eq.false')

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log(`📧 Found ${schedules?.length || 0} schedules needing reminders`)

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ 
        message: 'No schedules need reminders',
        count: 0,
        timestamp: now.toISOString()
      })
    }

    // Get user profiles separately
    const userIds = [...new Set(schedules.map(s => s.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, whatsapp')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const emailPromises = schedules.map(async (schedule) => {
      const profile = profileMap.get(schedule.user_id)
      
      if (!profile?.email) {
        console.log(`⚠️ No email found for user ${schedule.user_id}`)
        return null
      }

      // Extract first group from array (Supabase returns arrays for joins)
      const rawGroup = Array.isArray(schedule.facebook_groups) 
        ? schedule.facebook_groups[0] 
        : schedule.facebook_groups

      const typedSchedule: PostSchedule = {
        id: schedule.id,
        scheduled_for: schedule.scheduled_for,
        status: schedule.status,
        reminder_sent: schedule.reminder_sent,
        user_id: schedule.user_id,
        post_type: schedule.post_type,
        target_audience: schedule.target_audience,
        special_context: schedule.special_context,
        vehicle_data: schedule.vehicle_data,
        testimonial_data: schedule.testimonial_data,
        special_offer: schedule.special_offer,
        generated_content: schedule.generated_content,
        facebook_groups: rawGroup ? {
          name: rawGroup.name,
          group_url: rawGroup.group_url,
          group_type: rawGroup.group_type,
          description: rawGroup.description,
          territories: Array.isArray(rawGroup.territories) && rawGroup.territories.length > 0 
            ? { name: rawGroup.territories[0].name }
            : undefined
        } : null,
        profiles: profile
      }
      
      if (!typedSchedule.profiles?.email) {
        console.log(`⚠️ No email found for user ${typedSchedule.user_id}`)
        return null
      }

      const fbGroup = typedSchedule.facebook_groups
      const scheduledTime = new Date(typedSchedule.scheduled_for)
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
        console.log(`🤖 Generating fresh content for schedule ${typedSchedule.id}`)

        // Generate fresh content NOW
        const generatedContent = await generateFreshContent(typedSchedule, fbGroup)

        if (!generatedContent) {
          throw new Error('Failed to generate content')
        }

        console.log(`✅ Content generated (${generatedContent.length} chars)`)

        // Update schedule with generated content
        const { error: updateError } = await supabase
          .from('post_schedules')
          .update({
            generated_content: generatedContent,
            content_generated_at: new Date().toISOString(),
            status: 'content_ready'
          })
          .eq('id', typedSchedule.id)

        if (updateError) {
          console.error('❌ Error updating schedule with content:', updateError)
          throw updateError
        }

        console.log(`📨 Sending email to ${typedSchedule.profiles.email}`)

        // Send email with fresh content
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'UCG Social Scheduler <onboarding@resend.dev>',
          to: typedSchedule.profiles.email,
          subject: `⏰ Time to Post! - ${fbGroup?.name || 'your group'}`,
          html: generateEmailHTML(typedSchedule, fbGroup, generatedContent, formattedTime, timeUntilText)
        })

        // Mark reminder as sent
        await supabase
          .from('post_schedules')
          .update({ 
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', typedSchedule.id)

        console.log(`✅ Email sent successfully for schedule ${typedSchedule.id}`)
        return { 
          success: true, 
          scheduleId: typedSchedule.id, 
          email: typedSchedule.profiles.email,
          groupName: fbGroup?.name
        }
      } catch (emailError) {
        console.error(`❌ Failed to process schedule ${typedSchedule.id}:`, emailError)
        return { 
          success: false, 
          scheduleId: typedSchedule.id, 
          error: emailError instanceof Error ? emailError.message : String(emailError)
        }
      }
    })

    const results = await Promise.all(emailPromises)
    const validResults = results.filter(r => r !== null)
    const successCount = validResults.filter(r => r.success).length

    console.log(`✅ Cron job complete: ${successCount}/${validResults.length} emails sent`)

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} of ${validResults.length} reminder emails`,
      timestamp: new Date().toISOString(),
      details: {
        total: schedules.length,
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

// Generate fresh content using Claude API
async function generateFreshContent(
  schedule: PostSchedule,
  groupData: FacebookGroup | null
): Promise<string | null> {
  try {
    const territory = groupData?.territories?.name || 'Unknown'
    
    // Use the same prompt builder logic from your /api/posts/generate
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/posts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName: groupData?.name || 'Unknown Group',
        groupType: groupData?.group_type,
        territory: territory,
        groupDescription: groupData?.description,
        postType: schedule.post_type,
        specialOffer: schedule.special_offer,
        targetAudience: schedule.target_audience,
        additionalContext: schedule.special_context,
        vehicleData: schedule.vehicle_data,
        testimonialData: schedule.testimonial_data,
        userProfile: {
          full_name: schedule.profiles?.full_name || 'UCG Team',
          email: schedule.profiles?.email,
          whatsapp: schedule.profiles?.whatsapp
        }
      })
    })

    const data = await response.json()

    if (!response.ok || !data.content) {
      console.error('Failed to generate content:', data)
      return null
    }

    return data.content

  } catch (error) {
    console.error('Error generating content:', error)
    return null
  }
}

// Generate email HTML
function generateEmailHTML(
  schedule: PostSchedule,
  groupData: FacebookGroup | null,
  content: string,
  formattedTime: string,
  timeUntilText: string
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
                Fresh content generated just for you
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${schedule.profiles?.full_name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your scheduled Facebook post is coming up <strong>${timeUntilText}</strong>! We just generated fresh content based on current context.
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
                      ${groupData?.name || 'Unknown Group'}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fresh Content Badge -->
              <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">
                  ✨ Fresh Content Generated
                </p>
                <p style="margin: 8px 0 0 0; color: #166534; font-size: 13px;">
                  This content was generated just now with current context and timely information.
                </p>
              </div>

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
                <pre style="margin: 0; color: #111827; font-size: 14px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${content}</pre>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${groupData?.group_url 
                      ? `<a href="${groupData.group_url}" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Go to Facebook Group →
                        </a>`
                      : `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ucg-social-scheduler.com'}/dashboard/posts" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Scheduled Posts →
                        </a>`
                    }
                  </td>
                </tr>
              </table>

              <!-- Regenerate Option -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                  <strong>💡 Need different content?</strong> You can regenerate the post anytime from your dashboard before posting.
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
}

// Allow POST as well for testing
export async function POST(request: Request) {
  return GET(request)
}

// Allow the route to run for up to 60 seconds
export const maxDuration = 60