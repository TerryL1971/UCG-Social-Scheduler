// app/api/cron/generate-content/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 Starting auto-generation cron job...')

    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    console.log(`⏰ Looking for posts scheduled between ${now.toISOString()} and ${twoHoursFromNow.toISOString()}`)

    const { data: postsToGenerate, error: fetchError } = await supabase
      .from('post_schedules')
      .select(`
        id,
        user_id,
        group_id,
        scheduled_for,
        post_type,
        target_audience,
        special_context,
        vehicle_data,
        testimonial_data,
        special_offer,
        facebook_groups!inner (
          name,
          group_type,
          description,
          territory_id,
          territories (
            name
          )
        )
      `)
      .is('generated_content', null)
      .eq('status', 'scheduled')
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

        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/posts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groupName: groupData?.name || 'Unknown',
            groupType: groupData?.group_type,
            territory: territoryName,
            groupDescription: groupData?.description,
            postType: post.post_type,
            specialOffer: post.special_offer,
            targetAudience: post.target_audience,
            additionalContext: post.special_context,
            vehicleData: post.vehicle_data,
            testimonialData: post.testimonial_data
          })
        })

        const generateResult = await generateResponse.json()

        if (!generateResponse.ok || !generateResult.content) {
          throw new Error(generateResult.details || 'Failed to generate content')
        }

        const { error: updateError } = await supabase
          .from('post_schedules')
          .update({
            generated_content: generateResult.content,
            status: 'content_ready',
            content_generated_at: new Date().toISOString()
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
        
        await supabase
          .from('post_schedules')
          .update({
            status: 'failed',
            special_context: `Generation failed: ${error.message}`
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