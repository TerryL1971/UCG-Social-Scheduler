// app/api/cron/generate-content/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase with service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 Starting auto-generation cron job...')

    // Calculate time window: now to 2 hours from now
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    console.log(`⏰ Looking for posts scheduled between ${now.toISOString()} and ${twoHoursFromNow.toISOString()}`)

    // Find posts that need content generation
    const { data: postsToGenerate, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        user_id,
        group_id,
        scheduled_for,
        post_type,
        ai_metadata,
        notes,
        facebook_groups!inner (
          name,
          territory_id,
          territories (
            name
          )
        )
      `)
      .is('generated_content', null) // Content not yet generated
      .eq('status', 'pending')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', twoHoursFromNow.toISOString())

    if (fetchError) {
      console.error('❌ Error fetching posts:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${postsToGenerate?.length || 0} posts needing content generation`)

    if (!postsToGenerate || postsToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts need generation at this time',
        generated: 0
      })
    }

    const results = []
    let successCount = 0
    let failCount = 0

    // Generate content for each post
    for (const post of postsToGenerate) {
      try {
        console.log(`🎨 Generating content for post ${post.id}...`)

        const groupData: any = Array.isArray(post.facebook_groups) 
          ? post.facebook_groups[0] 
          : post.facebook_groups

        let territoryName = 'Unknown'
        if (groupData?.territories) {
          territoryName = Array.isArray(groupData.territories) 
            ? groupData.territories[0]?.name || 'Unknown'
            : groupData.territories?.name || 'Unknown'
        }

        const aiMetadata = post.ai_metadata || {}

        // Call the generation API
        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/posts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groupName: groupData?.name || 'Unknown',
            territory: territoryName || 'Unknown',
            postType: post.post_type,
            specialOffer: aiMetadata.special_offer,
            targetAudience: aiMetadata.target_audience,
            additionalContext: aiMetadata.special_context || post.notes,
            vehicleData: aiMetadata.vehicle_data,
            testimonialData: aiMetadata.testimonial_data
          })
        })

        const generateResult = await generateResponse.json()

        if (!generateResponse.ok || !generateResult.content) {
          throw new Error(generateResult.details || 'Failed to generate content')
        }

        // Update post with generated content
        const { error: updateError } = await supabase
          .from('scheduled_posts')
          .update({
            generated_content: generateResult.content,
            status: 'ready',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ Successfully generated content for post ${post.id}`)
        successCount++
        results.push({
          postId: post.id,
          status: 'success',
          scheduledFor: post.scheduled_for
        })

      } catch (error: any) {
        console.error(`❌ Failed to generate content for post ${post.id}:`, error)
        failCount++
        
        // Mark post as failed
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            notes: `Generation failed: ${error.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        results.push({
          postId: post.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    console.log(`✅ Cron job complete: ${successCount} succeeded, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Generated content for ${successCount} posts`,
      generated: successCount,
      failed: failCount,
      results
    })

  } catch (error: any) {
    console.error('💥 Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'