import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const body = await request.json()
    
    const {
      productName,
      features,
      callToAction,
      tone,
      groupName,
      groupDescription,
    } = body

    const prompt = `You are writing a Facebook advertisement for Used Car Guys Stuttgart, a military-focused dealership. Your posts are EXTREMELY emoji-heavy and visually engaging.

VEHICLE: ${productName}
FEATURES: ${features}
CALL TO ACTION: ${callToAction}
TONE: ${tone} (but very enthusiastic with tons of emojis!)
FACEBOOK GROUP: ${groupName}
${groupDescription ? `GROUP INFO: ${groupDescription}` : ''}

YOUR WRITING STYLE:
- Use 50-70+ emojis throughout the post
- Add emojis at the END of most sentences (✨🎉💙)
- Use multiple emojis in a row (✨✨, 🚗🚗, 💙💙💙)
- Be VERY enthusiastic and friendly
- Write 600-900 words

STRUCTURE YOUR POST LIKE THIS:

🚗✨ Check out this ${productName}! ✨🚗

📱 Call or WhatsApp Terry: +49 151 6522 7520
📧 Email: terry@usedcarguys.net
💰 Financing available! 🎉

[Write 2-3 enthusiastic opening sentences with emojis at the end]

FEATURES:
[Write 12-15 detailed bullet points, each starting with * and including emojis]
Examples:
* 🚗 Dual Motor All-Wheel Drive for superior traction ✨
* 🔋 100% electric – zero emissions and low running costs 💚
* 📱 Wireless phone charging and USB-C ports 💙
[Continue with all the features from the list above]

KEY SPECS:
* 📏 Miles: [estimate based on vehicle]
* ⚙️ Engine: [details based on vehicle type] 🔥
* ✅ EU Specification With Buy Back Offer Guarantee 🎯

💵 Price: Competitive pricing with financing options from $XXX/month including 1-year warranty! 🎉✨

WHY CHOOSE USED CAR GUYS: 🌟🌟
✅ Exclusively serving the Military since 2012 🇺🇸
✅ Buy Back Offer Guarantee 🤝💙
✅ 2-year warranty upgrade available 🛡️
✅ We walk you through the entire process 👥✨
✅ Top prices for trade-ins 💰🚗
✅ We'll Buy It Back When You Leave ✈️
✅ Guaranteed to Pass Military Inspection 🔍✅
✅ Also Available Without SOFA Status 📋

"The Closest Thing to a Leasing Program Overseas" 🌍✨

${callToAction} 🎉

📞 Contact Terry:
📱 Tel/WhatsApp: +49 (0)151 6522 7520
📧 Email: terry@usedcarguys.net

Visit us at Robert-Bosch-Straße 6, 71101 Schönaich (right near Panzer Kaserne!) 🚗

Come see us today! ✨🎉🚀

CRITICAL REQUIREMENTS:
- Write the FULL 600-900 words - do NOT stop early
- Use 50-70+ emojis throughout
- Add emojis to the end of most sentences
- Use * for all bullet points
- NO hashtags
- Be extremely enthusiastic and emoji-heavy
- Make it feel authentic and personal`

    console.log('Calling Claude API...')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    
    console.log('Claude generated:', content.length, 'characters')

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Claude API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}