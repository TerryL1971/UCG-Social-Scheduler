// lib/email-templates.ts

type EmailTemplateData = {
  userName: string
  postContent: string
  groupName: string
  scheduledTime: string
  postId: string
  dashboardUrl: string
}

type ViolationEmailData = {
  userName: string
  managerName: string
  groupName: string
  territory: string
  userTerritory: string
  scheduledTime: string
  dashboardUrl: string
}

export function generateReminderEmail(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post Reminder - UCG Social Scheduler</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🚗 UCG Social Scheduler
              </h1>
              <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 14px;">
                Used Car Guys Marketing Platform
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                ⏰ Time to Post!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your post for <strong style="color: #dc2626;">${data.groupName}</strong> is ready to go! 
                It's scheduled for <strong>${data.scheduledTime}</strong>.
              </p>
              
              <!-- Post Content Box -->
              <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: 600;">
                  Your Post Content:
                </h3>
                <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
${data.postContent}
                </p>
              </div>
              
              <!-- Action Buttons -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}/dashboard/posts/${data.postId}/view" 
                       style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Tips Box -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 30px 0; border-radius: 6px;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  💡 Quick Tips:
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                  <li>Copy the content from your dashboard</li>
                  <li>Post it to your Facebook group</li>
                  <li>Mark it as "Posted" in the dashboard</li>
                  <li>Engage with comments to build community</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Questions? Reply to this email or contact your manager.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                © 2026 Used Car Guys Marketing Platform
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated reminder from UCG Social Scheduler
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function generateViolationAlertEmail(data: ViolationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Territory Violation Alert - UCG Social Scheduler</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ⚠️ Territory Violation Alert
              </h1>
              <p style="margin: 10px 0 0 0; color: #fed7aa; font-size: 14px;">
                UCG Social Scheduler Compliance System
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${data.managerName},
              </p>
              
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                A territory violation has been logged by <strong>${data.userName}</strong>.
              </p>
              
              <!-- Violation Details Box -->
              <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #9a3412; font-size: 18px; font-weight: 600;">
                  Violation Details:
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">User:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">Posted to Group:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.groupName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">Group Territory:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.territory}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">User's Territory:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.userTerritory}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">Scheduled For:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.scheduledTime}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Action Required Box -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; margin: 30px 0; border-radius: 6px;">
                <h4 style="margin: 0 0 10px 0; color: #78350f; font-size: 14px; font-weight: 600;">
                  📋 Action Required:
                </h4>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.8;">
                  Please review this violation in the management dashboard. The salesperson may request authorization 
                  or provide justification for posting outside their assigned territory.
                </p>
              </div>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}/dashboard/violations" 
                       style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Review Violations
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This is an automated alert from the UCG compliance system.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                © 2026 Used Car Guys Marketing Platform
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Territory Compliance Monitoring System
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function generateWelcomeEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to UCG Social Scheduler</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                Welcome to UCG! 🎉
              </h1>
              <p style="margin: 15px 0 0 0; color: #fecaca; font-size: 16px;">
                Your Social Media Scheduling Platform
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                Hi ${userName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We're excited to have you on board! UCG Social Scheduler makes it easy to manage your Facebook 
                group posts with AI-powered content generation.
              </p>
              
              <!-- Features Box -->
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 25px; margin: 30px 0; border-radius: 6px;">
                <h3 style="margin: 0 0 20px 0; color: #166534; font-size: 18px; font-weight: 600;">
                  What You Can Do:
                </h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 24px; margin-right: 10px;">🤖</span>
                    </td>
                    <td style="padding: 10px 0;">
                      <strong style="color: #166534; display: block; margin-bottom: 5px;">AI Content Generation</strong>
                      <span style="color: #15803d; font-size: 14px;">Let AI create engaging posts tailored to your territory</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 24px; margin-right: 10px;">📅</span>
                    </td>
                    <td style="padding: 10px 0;">
                      <strong style="color: #166534; display: block; margin-bottom: 5px;">Smart Scheduling</strong>
                      <span style="color: #15803d; font-size: 14px;">Plan posts in advance and get reminders</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 24px; margin-right: 10px;">🎯</span>
                    </td>
                    <td style="padding: 10px 0;">
                      <strong style="color: #166534; display: block; margin-bottom: 5px;">Territory Management</strong>
                      <span style="color: #15803d; font-size: 14px;">Automatic compliance tracking and alerts</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 24px; margin-right: 10px;">📊</span>
                    </td>
                    <td style="padding: 10px 0;">
                      <strong style="color: #166534; display: block; margin-bottom: 5px;">Analytics</strong>
                      <span style="color: #15803d; font-size: 14px;">Track your posting activity and performance</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Get Started Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/dashboard" 
                       style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: 600; font-size: 18px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Quick Start Tips -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                  Quick Start Tips:
                </h4>
                <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 2;">
                  <li>Complete your profile and upload an avatar</li>
                  <li>Add your Facebook groups</li>
                  <li>Schedule your first post with AI</li>
                  <li>Set up your notification preferences</li>
                </ol>
              </div>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Contact your manager or reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                © 2026 Used Car Guys Marketing Platform
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you signed up for UCG Social Scheduler
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}