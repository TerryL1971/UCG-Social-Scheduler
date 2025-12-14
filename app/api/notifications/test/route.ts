// app/api/notifications/test/route.ts

import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' },
        { status: 401 }
      )
    }

    const userName = (user.user_metadata?.full_name as string) || 'there'
    const userEmail = user.email!

    console.log('Sending test email to:', userEmail)

    const { data, error } = await resend.emails.send({
      from: 'UCG Post Scheduler <onboarding@resend.dev>',
      to: userEmail,
      subject: 'Test Email - Your notifications are working!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6; 
                color: #1f2937; 
                margin: 0;
                padding: 0;
                background-color: #f3f4f6;
              }
              .container { 
                max-width: 600px; 
                margin: 40px auto; 
                background-color: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
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
              .success-icon {
                font-size: 64px;
                margin-bottom: 10px;
              }
              .info-box {
                background: #ecfdf5;
                border: 2px solid #10b981;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
              }
              .footer { 
                text-align: center; 
                color: #9ca3af; 
                font-size: 13px; 
                padding: 30px;
                border-top: 1px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Email Notifications Working!</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; font-weight: 600; color: #10b981; margin-bottom: 20px;">
                  Great news! Your email notifications are set up correctly.
                </p>
                
                <p>Hi ${userName}! 👋</p>
                
                <p style="color: #6b7280;">
                  This is a test email to confirm that your UCG Social Scheduler notification system is working properly.
                </p>

                <div class="info-box">
                  <p style="margin: 0; font-weight: 600; color: #065f46;">📧 What happens next?</p>
                  <p style="margin: 10px 0 0 0; color: #047857;">
                    You will receive email reminders 1 hour before your scheduled posts. 
                    This helps ensure you never miss posting to your Facebook groups!
                  </p>
                </div>

                <p style="color: #374151;">
                  Your email: <strong>${userEmail}</strong>
                </p>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  If you did not request this test email, you can safely ignore it.
                </p>
              </div>
              <div class="footer">
                <p>UCG Social Scheduler - Automated Post Management</p>
                <p style="margin-top: 10px;">Sent at ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send test email', details: error },
        { status: 500 }
      )
    }

    console.log('Test email sent successfully:', data?.id)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      emailId: data?.id,
      sentTo: userEmail
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', details: String(error) },
      { status: 500 }
    )
  }
}