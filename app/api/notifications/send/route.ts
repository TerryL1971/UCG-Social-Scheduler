// app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()

    const supabase = await createServerSupabaseClient()

    // Get the scheduled post with user and group info
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        profiles (email, full_name),
        facebook_groups (name)
      `)
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Don't send if already posted or not ready
    if (post.status !== 'pending' && post.status !== 'ready') {
      return NextResponse.json({ error: 'Post not in pending/ready state' }, { status: 400 })
    }

    const userEmail = post.profiles?.email
    const userName = post.profiles?.full_name || 'there'
    const groupName = post.facebook_groups?.name || 'Unknown Group'
    const scheduledTime = new Date(post.scheduled_for).toLocaleString()

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `UCG Scheduler <${process.env.FROM_EMAIL}>`, // Change to your domain
      to: userEmail,
      subject: `⏰ Time to Post to ${groupName}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .post-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .post-content { font-family: 'Courier New', monospace; white-space: pre-wrap; background: #f3f4f6; padding: 15px; border-radius: 5px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
              .button:hover { background: #5568d3; }
              .secondary-button { background: #6b7280; }
              .secondary-button:hover { background: #4b5563; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚗 Time to Post! 🚗</h1>
              </div>
              <div class="content">
                <p>Hi ${userName}! 👋</p>
                <p>It's time to post to <strong>${groupName}</strong></p>
                <p><strong>Scheduled for:</strong> ${scheduledTime}</p>
                
                <div class="post-box">
                  <h3>📝 Your Post Content:</h3>
                  <div class="post-content">${post.generated_content}</div>
                </div>
                
                <p><strong>Quick Instructions:</strong></p>
                <ol>
                  <li>Copy the content above</li>
                  <li>Go to Facebook and post it to ${groupName}</li>
                  <li>Click the button below to mark as posted</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL}/dashboard/posts/${postId}/mark-posted" class="button">
                    ✅ Mark as Posted
                  </a>
                  <a href="${process.env.NEXTAUTH_URL}/dashboard/posts" class="button secondary-button">
                    View All Posts
                  </a>
                </div>
              </div>
              
              <div class="footer">
                <p>UCG Social Scheduler • Sent from your automated posting system</p>
                <p>You can adjust notification settings in your dashboard</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update post status to 'ready'
    await supabase
      .from('scheduled_posts')
      .update({ status: 'ready' })
      .eq('id', postId)

    return NextResponse.json({ success: true, emailId: emailData?.id })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}