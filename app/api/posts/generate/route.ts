// app/api/posts/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Validate API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { 
          error: 'Configuration error', 
          details: 'Anthropic API key is not configured. Please check your environment variables.' 
        },
        { status: 500 }
      )
    }

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
      testimonialData,
      userProfile
    } = body

    // Validate required fields
    if (!groupName || !territory) {
      return NextResponse.json(
        { error: 'Missing required fields: groupName and territory' },
        { status: 400 }
      )
    }

    // Build the AI prompt based on group context
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
      userProfile
    })

    console.log('Generating post with Claude:', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      promptLength: prompt.length,
      postType,
      territory
    })

    // Generate post using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096, // Increased for longer Brand Awareness posts
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract the generated text
    const generatedContent = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    return NextResponse.json({
      success: true,
      content: generatedContent,
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      raw: error
    })
    return NextResponse.json(
      { 
        error: 'Failed to generate post', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groupDescription, 
    postType, 
    specialOffer,
    targetAudience,
    additionalContext,
    vehicleData,
    testimonialData,
    userProfile
  } = params

  // Determine if this is Stuttgart Brand Awareness (needs Nick + Terry)
  const isStuttgartBrandAwareness = territory.toLowerCase().includes('stuttgart') && postType === 'brand_awareness'
  
  // Extract salesperson info from user profile
  const salesPerson = userProfile?.full_name || 'our team'
  const salesWhatsApp = userProfile?.whatsapp || ''
  const salesEmail = userProfile?.email || ''
  
  // Leadership team (Nick + Terry for Stuttgart Brand Awareness only)
  const nickMorley = {
    name: 'Nick Morley',
    whatsapp: '+49 172 712 9046'
  }
  const terryLombardi = {
    name: 'Terry Lombardi',  
    whatsapp: '+49 151 6522 7520',
    email: 'terry@usedcarguys.net'
  }

  let basePrompt = ''

  // ===========================================
  // BRAND AWARENESS POST (Very Different!)
  // ===========================================
  if (postType === 'brand_awareness') {
    basePrompt = `You are writing a BRAND AWARENESS Facebook post for Used Car Guys (UCG), a car dealership serving US military personnel in Germany.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}
${groupType ? `GROUP TYPE: ${groupType}` : ''}

⚠️ CRITICAL: This is a BRAND AWARENESS post - NOT a vehicle ad!

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

Share 5-8 specific stories/events:
- Community events hosted
- Classes or activities (dance, fitness, educational)
- Local business support
- Scholarship programs
- Fun mascot/character updates (like Stewie the sloth)
- Charitable activities
- Military family support

Each story should be 2-3 sentences with emojis. Be creative and heartfelt!

Examples:
"🎉 We hosted a Celebration of Life Event for a beloved member of the USAG ${territory} Community in our FREE event space. 💚"
"🕺💃 Line Dance Classes were in full swing in our FREE event space. Multiple classes were held and more to come! ✨"
"📚⭐ Our John S. Sweeney Scholarship is now in full swing as participants' videos are posted for YOUR vote! 🏆"

4️⃣ LOOKING AHEAD:
"I wonder what [NEXT MONTH] will hold? Follow us on Used Car Guys ${territory} and find out more about our upcoming events and don't forget to check out our outstanding inventory! 🚗🎯"

5️⃣ WHAT WE OFFER SECTION:
"We have soooo much to offer you. Check this out: 😊"
1. FREE Event Space for the USAG Community
2. We support the Home Based Businesses
3. The John S. Sweeney Memorial Scholarship only for the USAG
4. Check out the HBB Little Shops located here at UCG

6️⃣ VEHICLE INVENTORY TRANSITION:
"Looking for your next car? At Used Car Guys, we're proud to offer a wide selection of top-quality pre-owned vehicles at prices you'll love! 🚗💙"

7️⃣ WHY CHOOSE US:
"💡 Why Choose Us?"
✅ Quality Assurance – Every car undergoes a thorough inspection to ensure you're getting the very best.
✅ Diverse Inventory – Both U.S. and E.U. Spec vehicles, from sporty sedans to family-friendly SUVs, we have the perfect car to fit your needs.
✅ Guaranteed Buy Back Offer– Come back to us when you are ready to sell!
✅ Expert Guidance – Our friendly team${isStuttgartBrandAwareness ? `, featuring ${nickMorley.name} and ${terryLombardi.name},` : ''} are here to guide you every step of the way—no pressure, just support!
✅ Check Our Google Reviews - Nearly 200 five-star reviews from the USAG ${territory} community!

8️⃣ VISIT US SECTION:
"📍 Visit Us:"
"Stop by our ${territory} showroom at Robert-Bosch-Straße 6, 71101 Schönaich, and see why we're the trusted choice for used cars in the region.${territory.toLowerCase().includes('stuttgart') ? " We're just around the corner from Panzer Kaserne!" : ''} ✨"
"🌐 Website: www.usedcarguys.net"

9️⃣ MEET THE TEAM:
${isStuttgartBrandAwareness 
  ? `"Come on in and meet our "Good Guys"!, ${terryLombardi.name} and ${nickMorley.name} and of course… Karl the Cat. 🐱💙"`
  : `"Come on in and meet ${salesPerson} and the team! We're here to help you find your perfect vehicle. 🚗✨"`
}

🔟 CONTACT SECTION:
"📞 Contact:"
${isStuttgartBrandAwareness 
  ? `${terryLombardi.name}'s WhatsApp at ${terryLombardi.whatsapp}
${nickMorley.name}'s WhatsApp ${nickMorley.whatsapp}
Karl the Cat: Only accepts in person visits and head scratches if you feel so inclined. 🐱😊`
  : `${salesPerson}'s WhatsApp: ${salesWhatsApp}
${salesEmail ? `📧 Email: ${salesEmail}` : ''}`
}

1️⃣1️⃣ CLOSING CTA:
"👍 Don't forget to like our page to stay updated on the latest arrivals, exclusive offers, and more!"
"💚 Your next car is waiting for you at The Used Car Guys ${territory} Showroom. Come see us today!${territory.toLowerCase().includes('stuttgart') ? " Don't forget to ask us about our low priced auto insurance with AmericanAutoNation and our extended warranty program. 💙✨" : ' 🚗✨'}"

${targetAudience ? `\n🎯 TARGET AUDIENCE: ${targetAudience}` : ''}
${additionalContext ? `\n📝 ADDITIONAL CONTEXT: ${additionalContext}` : ''}

🎨 REMEMBER: 
- Use 50+ emojis throughout
- 1,500+ words minimum
- Be warm, personal, community-focused
- Tell stories and build relationships
- This is about UCG being part of the community, not just selling cars!`
  }

  // ===========================================
  // VEHICLE SPOTLIGHT POST
  // ===========================================
  else if (postType === 'vehicle_spotlight' && vehicleData) {
    basePrompt = `You are writing a VEHICLE SPOTLIGHT Facebook post for Used Car Guys (UCG).

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

VEHICLE DETAILS:
- Make/Model: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
${vehicleData.price ? `- Price: ${vehicleData.price}` : '- Price: Contact for pricing'}
${vehicleData.mileage ? `- Mileage: ${vehicleData.mileage}` : ''}
- Condition: ${vehicleData.condition}
${vehicleData.features ? `- Features: ${vehicleData.features}` : ''}

📏 LENGTH: 800-1,200 words (shorter than Brand Awareness, but still detailed!)

🎨 EMOJI USAGE: 30-40 emojis throughout (🚗 ✨ 💙 🔥 ⚡ 💪 🎯 ⭐ 🙌 etc.)

📝 STRUCTURE - FOLLOW THIS:

1️⃣ OPENING (Eye-catching):
"🚗✨ Check out this AMAZING vehicle! ✨🚗"
"📱 Call/WhatsApp ${salesPerson}: ${salesWhatsApp}"
${salesEmail ? `"📧 Email: ${salesEmail}"` : ''}
"💰 Payments available! 🎉"

2️⃣ EXCITEMENT INTRO:
"Get ready to fall in LOVE with your next ride! 🥳💙💙 This incredible ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} is waiting for YOU and it's absolutely PERFECT for military life in Germany! 🇺🇸✨🚗"

3️⃣ FEATURES SECTION (15-20 bullet points with emojis):
"FEATURES:"
List out features with relevant emojis. Examples:
* 🚗 Smooth and reliable performance ✨
* ⚡ Fuel efficient for those European gas prices 💙
* 🔒 Advanced safety features 🛡️
* 🌟 Comfortable interior seating 💫
* 🎵 Premium sound system 🔥
* ❄️ Climate control for all seasons ✨
${vehicleData.features ? `Include these specific features: ${vehicleData.features}` : ''}

4️⃣ KEY SPECS:
"KEY SPECS:"
* 📏 Miles: ${vehicleData.mileage || 'Contact for details'} ✨
* ⚙️ Engine: High-performance and reliable 🔥
* ✅ ${vehicleData.condition === 'eu_spec' ? 'EU Spec With Buy Back Guarantee' : 'US Spec Available'} 🎯

5️⃣ PRICING:
"💵 Price: ${vehicleData.price || 'Contact for pricing or payments available'} + 1yr warranty! 🎉✨"

6️⃣ ENTHUSIASM SECTION:
"This STUNNING vehicle is exactly what you've been searching for! 🌟💙💙 Whether you're commuting to base, exploring the beautiful German countryside, or taking weekend trips around Europe, this car will be your perfect companion! 🚗✨🎉"

7️⃣ MILITARY FOCUS:
"We know how important it is to have a dependable vehicle when you're stationed overseas! 🇺🇸🌍 That's why we've carefully inspected every detail to ensure you're getting the BEST possible car for your needs! 💪👏"

8️⃣ URGENCY:
"Don't let this INCREDIBLE opportunity slip away! 🎯🔥 This amazing vehicle won't last long in our lot, and we want to make sure YOU get the chance to drive it home today! 🏠🚗💙"

9️⃣ WHY CHOOSE US:
"WHY CHOOSE US: 🌟"
✅ Serving Military since 2012 🇺🇸
✅ Buy Back Guarantee 🤝💙
✅ 2yr warranty available 🛡️
✅ We guide you through everything 👥✨
✅ Top trade-in prices 💰🚗
✅ Buy It Back When You Leave ✈️
✅ Military Inspection Guaranteed 🔍✅
✅ No SOFA Status needed 📋
"Closest Thing to Leasing Overseas" 🌍✨

🔟 CONTACT CTA:
"Ready to drive your DREAM car? 🎉"
"📞 Contact ${salesPerson}:"
"📱 ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}
"Visit us at Robert-Bosch-Straße 6, 71101 Schönaich${territory.toLowerCase().includes('stuttgart') ? ' (right near Panzer Kaserne!)' : ''} 🚗"
"Come see us today! 🚗✨🎉"

🎨 TONE: Enthusiastic, exciting, lots of exclamation points! Make them LOVE this car!`
  }

  // ===========================================
  // SPECIAL OFFER POST
  // ===========================================
  else if (postType === 'special_offer') {
    basePrompt = `You are writing a SPECIAL OFFER Facebook post for Used Car Guys (UCG).

TARGET GROUP: ${groupName}
TERRITORY: ${territory}
OFFER: ${specialOffer || 'Special military pricing and promotions available'}
${vehicleData?.make ? `FEATURED VEHICLE: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}` : ''}

📏 LENGTH: 600-900 words

🎨 EMOJI USAGE: 25-35 emojis (🎉 🔥 💥 ⏰ 💰 🚗 ✨ 💙 ⭐ etc.)

📝 STRUCTURE:

1️⃣ OPENING (Exciting):
"🎉🔥 SPECIAL OFFER ALERT! 🔥🎉"
"⏰ Limited Time Only! ⏰"

2️⃣ OFFER DETAILS:
"${specialOffer}"
Make it clear, exciting, and urgent! Use lots of emojis!

3️⃣ FEATURED VEHICLE (if applicable):
${vehicleData?.make ? `Highlight the ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} with features and price` : 'Highlight available inventory'}

4️⃣ BENEFITS:
"✅ Why Act NOW:"
- List 5-6 benefits of this offer
- Use check marks and emojis
- Create urgency

5️⃣ CONTACT:
"📞 Contact ${salesPerson}:"
"📱 ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}
"Visit us at Robert-Bosch-Straße 6, 71101 Schönaich 🚗"

6️⃣ URGENCY CTA:
"Don't miss out! This offer won't last long! 🔥⏰"

🎨 TONE: Urgent, exciting, create FOMO (fear of missing out)!`
  }

  // ===========================================
  // COMMUNITY POST
  // ===========================================
  else if (postType === 'community') {
    basePrompt = `You are writing a COMMUNITY FOCUS Facebook post for Used Car Guys (UCG).

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

📏 LENGTH: 800-1,200 words

🎨 EMOJI USAGE: 30-40 emojis (❤️ 💙 💚 🤗 🙌 🎉 ⭐ 🏆 etc.)

📝 FOCUS:
- Highlight UCG's commitment to the military community
- Share stories of helping military families
- Emphasize community partnerships and support
- Show appreciation for service members
- Include events, scholarships, or community programs

📝 STRUCTURE:

1️⃣ OPENING:
"❤️ Thank you to our ${territory} military community! ❤️"

2️⃣ COMMUNITY COMMITMENT:
- Share UCG's mission to serve military families
- Tell specific stories of community impact
- Mention events, programs, scholarships

3️⃣ WHY UCG CARES:
- Emphasize understanding military life
- Talk about challenges of overseas service
- Show how UCG supports through it all

4️⃣ INVITATION:
- Invite community to events
- Encourage them to stop by
- Build relationships

5️⃣ CONTACT:
"📞 ${salesPerson}: ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}

🎨 TONE: Warm, appreciative, community-focused, heartfelt!`
  }

  // ===========================================
  // TESTIMONIAL/SUCCESS STORY POST
  // ===========================================
  else if (postType === 'testimonial_style' && testimonialData) {
    basePrompt = `You are writing a CUSTOMER SUCCESS STORY Facebook post for Used Car Guys (UCG).

TARGET GROUP: ${groupName}
TERRITORY: ${territory}

CUSTOMER STORY:
- Customer: ${testimonialData.customerName || 'A military family'}
- Vehicle: ${testimonialData.vehicle}
${testimonialData.location ? `- Location: ${testimonialData.location}` : ''}
${testimonialData.experience ? `- Their Story: ${testimonialData.experience}` : ''}

📏 LENGTH: 600-800 words

🎨 EMOJI USAGE: 25-30 emojis (🎉 ⭐ 💙 🙌 😊 🚗 ✨ 🏆 etc.)

📝 STRUCTURE:

1️⃣ OPENING:
"🎉⭐ SUCCESS STORY ALERT! ⭐🎉"

2️⃣ THE STORY:
- Introduce the customer warmly
- Share their need/situation
- Describe how UCG helped
- Include quotes or specific details
- Show the happy outcome

3️⃣ THE VEHICLE:
- Highlight what they chose
- Why it was perfect for them
- Features they love

4️⃣ UCG'S ROLE:
- Emphasize the guidance provided
- No pressure, just support
- Making military life easier

5️⃣ INVITATION:
"Want to be our next success story? 💙"
"📞 Contact ${salesPerson}: ${salesWhatsApp}"
${salesEmail ? `"📧 ${salesEmail}"` : ''}

🎨 TONE: Warm, celebratory, inspiring, personal!`
  }

  // Add territory-specific context
  if (territory.toLowerCase().includes('stuttgart')) {
    basePrompt += `\n\n📍 STUTTGART CONTEXT:
- Mention Patch Barracks, Panzer Kaserne, or Kelley Barracks
- Reference the USAG Stuttgart community
- Note proximity: "right near Panzer Kaserne"
- Use "Stuttgart" naturally throughout`
  } else if (territory.toLowerCase().includes('ramstein') || territory.toLowerCase().includes('kmc')) {
    basePrompt += `\n\n📍 KMC/RAMSTEIN CONTEXT:
- Mention Ramstein Air Base - largest US military community outside USA
- Reference KMC (Kaiserslautern Military Community)
- Talk about airmen and Air Force families`
  }

  basePrompt += `\n\n🎨 FINAL REMINDERS:
- Use LOTS of emojis (owner's preference!)
- Be enthusiastic with exclamation points!
- Keep it personal and warm
- Focus on serving military families
- Make it feel authentic, not corporate

Generate the Facebook post now.`

  return basePrompt
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'AI Post Generation API is ready',
    model: 'claude-sonnet-4',
    endpoint: '/api/posts/generate'
  })
}