// app/api/posts/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      groupName, 
      groupType, 
      territory, 
      groupDescription,
      postType = 'general',
      specialOffer,
      targetAudience,
      additionalContext,
      vehicleData,
      testimonialData
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
      testimonialData
    })

    // Generate post using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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
    testimonialData
  } = params

  let basePrompt = `You are writing a Facebook post for Used Car Guys (UCG), a car dealership serving US military personnel in Germany.

TARGET GROUP: ${groupName}
TERRITORY: ${territory}
${groupType ? `GROUP TYPE: ${groupType}` : ''}
${groupDescription ? `GROUP CONTEXT: ${groupDescription}` : ''}

BRAND GUIDELINES:
- Professional yet friendly tone
- Focus on military community service
- Emphasize quality, reliability, and trust
- Mention proximity to military bases when relevant
- Keep it conversational and authentic
- Use emojis sparingly but effectively

POST REQUIREMENTS:
- Length: 1,000-5,000 characters (aim for detailed, engaging content)
- Use emojis strategically throughout (🚗 💪 ⭐ 🎯 etc.)
- Include a clear call-to-action
- Mention UCG by name
- Make it feel personal to this specific group
- Address local military community needs
- Sound natural, not like an advertisement
- Be conversational and warm
${targetAudience ? `- Target this specifically to: ${targetAudience}` : ''}
${additionalContext ? `- Additional context to include: ${additionalContext}` : ''}`

  // Customize based on post type
  if (postType === 'vehicle_spotlight' && vehicleData) {
    basePrompt += `\n\nPOST TYPE: Vehicle Spotlight
VEHICLE DETAILS:
- Make/Model: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
${vehicleData.price ? `- Price: ${vehicleData.price}` : ''}
${vehicleData.mileage ? `- Mileage: ${vehicleData.mileage}` : ''}
- Condition: ${vehicleData.condition}
${vehicleData.features ? `- Key Features: ${vehicleData.features}` : ''}

Highlight this specific vehicle and why it's perfect for military families in this area.`
  } else if (postType === 'special_offer') {
    basePrompt += `\n\nPOST TYPE: Special Offer
${specialOffer ? `OFFER DETAILS: ${specialOffer}` : 'Mention special military pricing or current promotions.'}
${vehicleData && vehicleData.make ? `\nFEATURED VEHICLE: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
${vehicleData.price ? `Price: ${vehicleData.price}` : ''}
${vehicleData.features ? `Features: ${vehicleData.features}` : ''}` : ''}`
  } else if (postType === 'community') {
    basePrompt += `\n\nPOST TYPE: Community Focus
Emphasize UCG's commitment to serving the military community and supporting local military families.`
  } else if (postType === 'testimonial_style' && testimonialData) {
    basePrompt += `\n\nPOST TYPE: Customer Success Story
CUSTOMER DETAILS:
- Customer: ${testimonialData.customerName || 'A military family'}
- Vehicle: ${testimonialData.vehicle}
${testimonialData.location ? `- Location: ${testimonialData.location}` : ''}
${testimonialData.experience ? `- Their Story: ${testimonialData.experience}` : ''}

Write this as if sharing a real success story about helping this customer find their perfect vehicle.`
  }

  // Territory-specific customization
  if (territory.toLowerCase().includes('stuttgart')) {
    basePrompt += `\n\nLOCAL CONTEXT: Stuttgart area - mention proximity to Patch Barracks, Panzer, or Kelley Barracks. This is a large military community with families who need reliable transportation.`
  } else if (territory.toLowerCase().includes('ramstein') || territory.toLowerCase().includes('kmc')) {
    basePrompt += `\n\nLOCAL CONTEXT: Kaiserslautern Military Community (KMC) - mention Ramstein Air Base, the largest US military community outside the USA. Many airmen and families need dependable vehicles.`
  } else if (territory.toLowerCase().includes('wiesbaden')) {
    basePrompt += `\n\nLOCAL CONTEXT: Wiesbaden area - home to USAREUR-AF headquarters. Professional military families value quality and reliability.`
  } else if (territory.toLowerCase().includes('grafenwoehr') || territory.toLowerCase().includes('vilseck')) {
    basePrompt += `\n\nLOCAL CONTEXT: Grafenwoehr/Vilseck area - serving soldiers and their families at one of the largest training areas in Europe.`
  }

  basePrompt += `\n\nGenerate the Facebook post now. Make it compelling, authentic, and perfect for ${groupName}.`

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