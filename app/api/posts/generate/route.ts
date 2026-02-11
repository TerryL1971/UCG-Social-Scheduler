// app/api/posts/generate/route.ts - MERGED VERSION with Credit Management

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Cost calculation constants
const COST_PER_1K_INPUT_TOKENS = 0.003 // €0.003 per 1K input tokens
const COST_PER_1K_OUTPUT_TOKENS = 0.015 // €0.015 per 1K output tokens
const ESTIMATED_INPUT_TOKENS = 300
const ESTIMATED_OUTPUT_TOKENS = 200

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // 1. AUTHENTICATION CHECK
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to generate content'
      }, { status: 401 })
    }

    // 2. GET USER PROFILE (for API key and test mode settings)
    const { data: profile } = await supabase
      .from('profiles')
      .select('test_mode, use_own_api_key, anthropic_api_key, full_name, email, whatsapp')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        details: 'User profile could not be loaded'
      }, { status: 404 })
    }

    const isTestMode = profile.test_mode || false
    const useOwnKey = profile.use_own_api_key || false
    const userApiKey = profile.anthropic_api_key

    // 3. PARSE REQUEST BODY
    const body = await request.json()
    const { 
      groupName, 
      groupType, 
      territory, 
      groupDescription,
      postType = 'brand_awareness',
      specialOffer,
      targetAudience,
      additionalContext,
      vehicleData,
      testimonialData
    } = body

    if (!groupName || !territory) {
      return NextResponse.json(
        { error: 'Missing required fields: groupName and territory' },
        { status: 400 }
      )
    }

    // 4. TEST MODE - RETURN MOCK DATA
    if (isTestMode) {
      // Log the test request
      await supabase.from('api_usage').insert({
        user_id: user.id,
        action: 'claude_generate',
        count: 1,
        tokens_used: 0,
        estimated_cost: 0,
        request_payload: body,
        response_success: true,
        test_mode: false
      })

      // Return mock content
      return NextResponse.json({
        success: true,
        content: `[TEST MODE] This is mock AI-generated content for testing.
        
🎯 Post Type: ${postType}
📍 Group: ${groupName}
🗺️ Territory: ${territory}

This content was generated in TEST MODE and did not consume any credits or API calls.

To generate real content, disable Test Mode in your settings.`,
        tokensUsed: 0,
        cost: 0,
        testMode: true,
        message: 'Test mode active - no credits consumed',
        metadata: {
          groupName,
          territory,
          groupType,
          postType,
          model: 'test-mode',
          timestamp: new Date().toISOString()
        }
      })
    }

    // 5. DETERMINE WHICH API KEY TO USE
    let apiKey: string | undefined

    if (useOwnKey && userApiKey) {
      apiKey = userApiKey
    } else {
      apiKey = process.env.ANTHROPIC_API_KEY
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No API key configured',
        details: 'Please add your Anthropic API key in settings or contact your administrator',
        action: 'configure_api_key'
      }, { status: 402 })
    }

    // 6. CHECK CREDIT BALANCE (if using system API key)
    if (!useOwnKey) {
      const { data: creditData } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      const estimatedCost = 
        (ESTIMATED_INPUT_TOKENS / 1000) * COST_PER_1K_INPUT_TOKENS +
        (ESTIMATED_OUTPUT_TOKENS / 1000) * COST_PER_1K_OUTPUT_TOKENS

      if (!creditData || creditData.balance < estimatedCost) {
        return NextResponse.json({ 
          error: 'Insufficient credits',
          details: `You need €${estimatedCost.toFixed(4)} to generate this post. Current balance: €${creditData?.balance.toFixed(4) || '0.0000'}`,
          action: 'purchase_credits',
          currentBalance: creditData?.balance || 0,
          requiredAmount: estimatedCost
        }, { status: 402 })
      }
    }

    // 7. BUILD PROMPT (using your existing logic)
    const prompt = buildPrompt({
      groupName,
      groupType,
      territory,
      groupDescription,
      postType,
      specialOffer,
      targetAudience,
      additionalContext,
      vehicleData,
      testimonialData,
      userProfile: {
        full_name: profile.full_name || 'UCG Sales Team',
        email: profile.email,
        whatsapp: profile.whatsapp
      }
    })

    // 8. CALL CLAUDE API
    console.log('Generating post with Claude:', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      promptLength: prompt.length,
      postType,
      territory,
      hasVehicleData: !!vehicleData?.make
    })

    const anthropic = new Anthropic({ apiKey })

    let actualInputTokens = 0
    let actualOutputTokens = 0
    let generatedContent = ''

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      generatedContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : ''

      actualInputTokens = message.usage?.input_tokens || ESTIMATED_INPUT_TOKENS
      actualOutputTokens = message.usage?.output_tokens || ESTIMATED_OUTPUT_TOKENS

      if (!generatedContent) {
        throw new Error('No content generated by AI')
      }

    } catch (apiError) {
      // Log failed API call
      await supabase.from('api_usage').insert({
        user_id: user.id,
        action: 'claude_generate',
        count: 1,
        tokens_used: 0,
        estimated_cost: 0,
        request_payload: body,
        response_success: false,
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
        test_mode: false
      })

      throw apiError
    }

    // 9. CALCULATE ACTUAL COST
    const actualCost = 
      (actualInputTokens / 1000) * COST_PER_1K_INPUT_TOKENS +
      (actualOutputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS

    // 10. DEDUCT CREDITS (if using system key)
    if (!useOwnKey) {
      const { data: currentCredits } = await supabase
        .from('credits')
        .select('balance, low_balance_notified')
        .eq('user_id', user.id)
        .single()

      const newBalance = (currentCredits?.balance || 0) - actualCost

      // Update balance
      await supabase
        .from('credits')
        .update({ 
          balance: newBalance,
          total_spent: (currentCredits?.balance || 0) - newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      // Log transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'usage',
          amount: -actualCost,
          balance_after: newBalance,
          description: `AI post generation - ${actualInputTokens + actualOutputTokens} tokens`,
          metadata: {
            input_tokens: actualInputTokens,
            output_tokens: actualOutputTokens,
            endpoint: 'claude_generate',
            post_type: postType,
            group_name: groupName
          }
        })

      // Check for low balance
      if (newBalance < 1.00 && !currentCredits?.low_balance_notified) {
        await supabase
          .from('credits')
          .update({ low_balance_notified: true })
          .eq('user_id', user.id)
      }
    }

    // 11. LOG API USAGE
    await supabase.from('api_usage').insert({
      user_id: user.id,
      action: 'claude_generate',
      count: 1,
      tokens_used: actualInputTokens + actualOutputTokens,
      estimated_cost: actualCost,
      request_payload: {
        ...body,
        used_own_key: useOwnKey
      },
      response_success: true,
      test_mode: false
    })

    // 12. RETURN SUCCESS
    return NextResponse.json({
      success: true,
      content: generatedContent,
      tokensUsed: actualInputTokens + actualOutputTokens,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      cost: useOwnKey ? 0 : actualCost,
      testMode: false,
      usedOwnKey: useOwnKey,
      metadata: {
        groupName,
        territory,
        groupType,
        postType,
        model: 'claude-sonnet-4',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('AI Generation Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// YOUR EXISTING buildPrompt FUNCTION (keeping all your logic)
function buildPrompt(params: {
  groupName: string
  groupType?: string
  territory: string
  groupDescription?: string
  postType: string
  specialOffer?: string
  targetAudience?: string
  additionalContext?: string
  vehicleData?: {
    make: string
    model: string
    year: string
    price?: string
    features?: string
    condition?: string
    mileage?: string
  }
  testimonialData?: {
    customerName?: string
    vehicle: string
    experience?: string
    location?: string
  }
  userProfile?: {
    full_name: string
    email?: string
    whatsapp?: string
  }
}) {
  const { 
    groupName, 
    groupType, 
    territory, 
    groupDescription, 
    postType, 
    specialOffer,
    targetAudience,
    additionalContext,
    vehicleData,
    testimonialData,
    userProfile
  } = params

  // CRITICAL: Add UCG context to EVERY prompt as safety fallback
  let basePrompt = `🚗 CRITICAL BUSINESS CONTEXT - READ THIS FIRST:

Company: Used Car Guys (UCG) / Used Car Guys GmbH
Business: PRE-OWNED VEHICLE DEALERSHIP serving US military personnel in Germany
What we sell: CARS - Used cars, pre-owned vehicles, automobiles
What we DO NOT sell: Real estate, houses, apartments, homes, or any property
Locations: Stuttgart (Schönaich near Panzer Kaserne) and Ramstein/KMC area
Address: Robert-Bosch-Straße 6, 71101 Schönaich, Germany
Website: www.usedcarguys.net

⚠️ ABSOLUTE RULE: You are writing about CARS and VEHICLES ONLY. Never mention houses, homes, real estate, apartments, or property buying. If you catch yourself writing about anything other than automobiles, STOP and rewrite about cars.

---

`

  const isStuttgartBrandAwareness = territory.toLowerCase().includes('stuttgart') && postType === 'brand_awareness'
  
  const salesPerson = userProfile?.full_name || 'our team'
  const salesWhatsApp = userProfile?.whatsapp || ''
  const salesEmail = userProfile?.email || ''
  
  const nickMorley = {
    name: 'Nick Morley',
    whatsapp: '+49 172 712 9046'
  }
  const terryLombardi = {
    name: 'Terry Lombardi',  
    whatsapp: '+49 151 6522 7520',
    email: 'terry@usedcarguys.net'
  }

  // BRAND AWARENESS POST
  if (postType === 'brand_awareness') {
    basePrompt += `You are writing a BRAND AWARENESS Facebook post for Used Car Guys (UCG), a CAR DEALERSHIP serving US military personnel in Germany.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}
${groupType ? `GROUP TYPE: ${groupType}` : ''}

⚠️ CRITICAL: This is a BRAND AWARENESS post about a CAR DEALERSHIP - NOT about real estate or housing!

📏 LENGTH REQUIREMENT:
- MINIMUM 1,500 words (aim for 2,000-3,000+ words)
- This should be DETAILED and COMPREHENSIVE
- Multiple sections with clear breaks
- Tell stories, share events, build relationships

🎨 EMOJI REQUIREMENTS (EXTREMELY IMPORTANT):
- Use 50+ emojis throughout the ENTIRE post
- Every 1-2 sentences should have an emoji
- Common ones: 🚗 ✨ 😍 ❤️ 💙 💚 💪 ⭐ 🎯 🏆 🙌 🎉 👋 😊 🤗 🦥 🐻 🕺 💃 🎵 🔒 💰
- Don't hold back - the owner LOVES emojis!

📝 TONE & VOICE:
- Warm, personal, community-focused (NOT salesy!)
- Excited and confident about serving military families  
- Like talking to friends and neighbors
- Enthusiastic and genuine
- Focus on RELATIONSHIPS first, cars second
- Share stories, events, community involvement

🎯 BRAND AWARENESS POST STRUCTURE - FOLLOW THIS EXACTLY:

1️⃣ OPENING (Warm Welcome):
"Welcome to Used Car Guys ${territory}! 🚗✨"
"We are more than a car dealership! We are part of YOUR Community. 😍😍"
"We are a place where fun abounds, community partnership is priority and memories are made. Cars are just what we do!"

2️⃣ RELATIONSHIP PHILOSOPHY:
Include a meaningful quote about relationships, community, or service. Example:
"To UCG ${territory} we believe in relationships with our community. This quote sums up what our relationship with YOU means to us:"
"Time is the currency of relationships. There is no way to invest in a relationship without investing your time! (Author unknown)."

3️⃣ COMMUNITY INVOLVEMENT SECTION:
"HERE'S HOW UCG ${territory.toUpperCase()} INVESTED IN YOUR COMMUNITY IN [CURRENT MONTH]! 😊🎉"

Share 5-8 specific stories/events about the CAR DEALERSHIP:
- Community events hosted at the dealership
- Classes or activities held at UCG
- Supporting local businesses at the dealership
- Scholarship programs for military families
- Fun mascot updates (like Stewie the sloth - UCG's mascot)
- Charitable activities
- Military family support initiatives
- Car-related events and gatherings

Each story should be 2-3 sentences with emojis. Be creative and heartfelt!

4️⃣ LOOKING AHEAD:
"I wonder what [NEXT MONTH] will hold? Follow us on Used Car Guys ${territory} and find out more about our upcoming events and don't forget to check out our outstanding inventory of vehicles! 🚗🎯"

5️⃣ WHAT WE OFFER SECTION:
"We have soooo much to offer you. Check this out: 😊"
1. FREE Event Space for the USAG Community
2. We support the Home Based Businesses  
3. The John S. Sweeney Memorial Scholarship only for the USAG
4. Check out the HBB Little Shops located here at UCG
5. Quality pre-owned vehicles for military families

6️⃣ VEHICLE INVENTORY TRANSITION:
"Looking for your next car? At Used Car Guys, we're proud to offer a wide selection of top-quality pre-owned vehicles at prices you'll love! 🚗💙"

7️⃣ WHY CHOOSE US FOR YOUR NEXT VEHICLE:
"💡 Why Choose Us?"
✅ Quality Assurance – Every car undergoes a thorough inspection
✅ Diverse Inventory – Both U.S. and E.U. Spec vehicles
✅ Guaranteed Buy Back Offer– Come back to us when you're ready to sell!
✅ Expert Guidance – Our friendly team${isStuttgartBrandAwareness ? `, featuring ${nickMorley.name} and ${terryLombardi.name},` : ''} are here to guide you every step of the way
✅ Check Our Google Reviews - Nearly 200 five-star reviews from the USAG ${territory} community!

8️⃣ VISIT US SECTION:
"📍 Visit Us:"
"Stop by our ${territory} showroom at Robert-Bosch-Straße 6, 71101 Schönaich, and see why we're the trusted choice for used cars in the region.${territory.toLowerCase().includes('stuttgart') ? " We're just around the corner from Panzer Kaserne!" : ''} ✨"
"🌐 Website: www.usedcarguys.net"

9️⃣ MEET THE TEAM:
${isStuttgartBrandAwareness 
  ? `"Come on in and meet our "Good Guys"! ${terryLombardi.name} and ${nickMorley.name} are here to help you find your perfect vehicle. 🚗✨"`
  : `"Come on in and meet ${salesPerson} and the team! We're here to help you find your perfect vehicle. 🚗✨"`
}

🔟 CONTACT SECTION:
"📞 Contact:"
${isStuttgartBrandAwareness 
  ? `${terryLombardi.name}'s WhatsApp at ${terryLombardi.whatsapp}
${nickMorley.name}'s WhatsApp ${nickMorley.whatsapp}`
  : `${salesPerson}'s WhatsApp: ${salesWhatsApp}
${salesEmail ? `📧 Email: ${salesEmail}` : ''}`
}

1️⃣1️⃣ CLOSING CTA:
"👍 Don't forget to like our page to stay updated on the latest vehicle arrivals, exclusive offers, and more!"
"💚 Your next car is waiting for you at The Used Car Guys ${territory} Showroom. Come see us today!${territory.toLowerCase().includes('stuttgart') ? " Don't forget to ask us about our low priced auto insurance with AmericanAutoNation and our extended warranty program. 💙✨" : ' 🚗✨'}"

${targetAudience ? `\n🎯 TARGET AUDIENCE: ${targetAudience}` : ''}
${additionalContext ? `\n📝 ADDITIONAL CONTEXT: ${additionalContext}` : ''}

🎨 REMEMBER: 
- Use 50+ emojis throughout
- 1,500+ words minimum
- This is about UCG CAR DEALERSHIP being part of the community
- NEVER mention houses, homes, or real estate!`
  }

  // VEHICLE SPOTLIGHT POST
  else if (postType === 'vehicle_spotlight') {
    if (!vehicleData || !vehicleData.make) {
      basePrompt += `You are writing a VEHICLE SPOTLIGHT Facebook post for Used Car Guys (UCG), a CAR DEALERSHIP.

⚠️ IMPORTANT: No specific vehicle data was provided, so write about UCG's GENERAL INVENTORY of quality pre-owned vehicles.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

📏 LENGTH: 800-1,200 words
🎨 EMOJI USAGE: 30-40 emojis (🚗 ✨ 💙 🔥 ⚡ 💪 🎯 ⭐ 🙌)

📝 CONTENT FOCUS:
Write an exciting post about:
- UCG's diverse selection of pre-owned vehicles
- Both US Spec and EU Spec vehicles available
- Quality inspection process
- Military-friendly pricing and buy-back guarantee
- Invite them to visit showroom to see current inventory
- Highlight that new vehicles arrive regularly

Include contact info:
"📞 Contact ${salesPerson}:"
"📱 ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}
"Visit us at Robert-Bosch-Straße 6, 71101 Schönaich 🚗"

Make it enthusiastic and exciting about the variety of vehicles available!`
    } else {
      basePrompt += `You are writing a VEHICLE SPOTLIGHT Facebook post for Used Car Guys (UCG), a CAR DEALERSHIP.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

VEHICLE DETAILS:
- Make/Model: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
${vehicleData.price ? `- Price: ${vehicleData.price}` : '- Price: Contact for pricing'}
${vehicleData.mileage ? `- Mileage: ${vehicleData.mileage}` : ''}
- Condition: ${vehicleData.condition || 'Excellent'}
${vehicleData.features ? `- Features: ${vehicleData.features}` : ''}

📏 LENGTH: 800-1,200 words
🎨 EMOJI USAGE: 30-40 emojis (🚗 ✨ 💙 🔥 ⚡ 💪 🎯 ⭐ 🙌)

📝 STRUCTURE:

1️⃣ OPENING:
"🚗✨ Check out this AMAZING vehicle! ✨🚗"
"📱 Call/WhatsApp ${salesPerson}: ${salesWhatsApp}"
${salesEmail ? `"📧 Email: ${salesEmail}"` : ''}
"💰 Payments available! 🎉"

2️⃣ EXCITEMENT INTRO:
"Get ready to fall in LOVE with your next ride! This incredible ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} is perfect for military life in Germany!"

3️⃣ FEATURES SECTION (15-20 bullet points with emojis):
"FEATURES:"
List vehicle features with emojis

4️⃣ KEY SPECS:
"KEY SPECS:"
* 📏 Miles: ${vehicleData.mileage || 'Contact for details'}
* ✅ ${vehicleData.condition === 'eu_spec' ? 'EU Spec With Buy Back Guarantee' : 'US Spec Available'}

5️⃣ PRICING:
"💵 Price: ${vehicleData.price || 'Contact for pricing'} + 1yr warranty! 🎉✨"

6️⃣ WHY CHOOSE US:
✅ Serving Military since 2012
✅ Buy Back Guarantee
✅ 2yr warranty available
✅ Military Inspection Guaranteed

7️⃣ CONTACT:
"📞 Contact ${salesPerson}:"
"📱 ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}
"Visit us at Robert-Bosch-Straße 6, 71101 Schönaich 🚗"

🎨 TONE: Enthusiastic, exciting, confident!`
    }
  }

  // SPECIAL OFFER POST
  else if (postType === 'special_offer') {
    basePrompt += `You are writing a SPECIAL OFFER post for Used Car Guys (UCG) CAR DEALERSHIP.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}
OFFER: ${specialOffer || 'Special military pricing and promotions available on quality pre-owned vehicles'}

📏 LENGTH: 600-900 words
🎨 EMOJI USAGE: 25-35 emojis (🎉 🔥 💥 ⏰ 💰 🚗 ✨)

Make it exciting and urgent about the vehicle offer!`
  }

  // COMMUNITY POST
  else if (postType === 'community') {
    basePrompt += `You are writing a COMMUNITY FOCUS post for Used Car Guys (UCG) CAR DEALERSHIP.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

📏 LENGTH: 800-1,200 words
🎨 EMOJI USAGE: 30-40 emojis

Focus on UCG's commitment to the military community and how the dealership supports military families.`
  }

  // TESTIMONIAL POST
  else if (postType === 'testimonial_style' && testimonialData) {
    basePrompt += `You are writing a CUSTOMER SUCCESS STORY for Used Car Guys (UCG) CAR DEALERSHIP.

Customer bought a VEHICLE from UCG (not a house!):
- Customer: ${testimonialData.customerName || 'A military family'}
- Vehicle: ${testimonialData.vehicle}

📏 LENGTH: 600-800 words
🎨 EMOJI USAGE: 25-30 emojis

Share their car-buying experience at UCG!`
  }

  // Add territory context
  if (territory.toLowerCase().includes('stuttgart')) {
    basePrompt += `\n\n📍 STUTTGART CONTEXT:
- Mention Patch Barracks, Panzer Kaserne, or Kelley Barracks
- Reference USAG Stuttgart community
- Note: "right near Panzer Kaserne"
- Address: Robert-Bosch-Straße 6, 71101 Schönaich`
  } else if (territory.toLowerCase().includes('ramstein') || territory.toLowerCase().includes('kmc')) {
    basePrompt += `\n\n📍 KMC/RAMSTEIN CONTEXT:
- Mention Ramstein Air Base
- Reference KMC (Kaiserslautern Military Community)
- Talk about airmen and Air Force families`
  }

  basePrompt += `\n\n🎨 FINAL REMINDERS:
- Use LOTS of emojis
- Be enthusiastic and confident!
- This is about Used Car Guys CAR DEALERSHIP
- NEVER write about real estate, houses, or homes
- Write about VEHICLES and CARS only

Generate the Facebook post now.`

  return basePrompt
}

export async function GET() {
  return NextResponse.json({
    status: 'AI Post Generation API with Credit Management',
    model: 'claude-sonnet-4',
    endpoint: '/api/posts/generate',
    features: [
      'Credit balance checking',
      'Test mode support',
      'User API key support',
      'Usage tracking',
      'Transaction logging'
    ]
  })
}