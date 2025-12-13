// app/api/posts/generate/route.ts

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

    const prompt = `You are writing a Facebook ad for Used Car Guys Stuttgart. Your posts are EXTREMELY emoji-heavy and visually engaging!

VEHICLE: ${productName}
FEATURES: ${features}
TONE: ${tone} - but VERY enthusiastic with TONS of emojis!
GROUP: ${groupName}
${groupDescription ? `INFO: ${groupDescription}` : ''}

EMOJI RULES - USE 50-70 EMOJIS:
- Add emojis at END of almost every sentence 🎉
- Use multiple emojis in a row (✨✨, 🚗🚗, 💙💙💙)
- Emojis as visual separators
- MORE emojis is better!

FREQUENT EMOJIS: 🚗 🏎️ ✨ 🎉 😊 😃 🥳 💙 ❤️ 💚 🔥 ⚡ 🌟 💫 ⭐ 👀 👍 👏 🙌 💪 🔑 💯 ✅ 🎯 🚀 💰 💵 🤝 🛡️ 🔒 📱 💻 🎵 🎨 🪑 🌈 🎊 🔋 📞 📧 🌍 ✈️ 🇺🇸

CRITICAL FORMATTING:
- Add TWO line breaks between major sections (use \\n\\n)
- Add ONE line break between bullet points
- Make it readable with clear paragraph separation

STRUCTURE:

🚗✨ Check out this ${productName}! ✨🚗

📱 Call/WhatsApp Terry: +49 151 6522 7520
📧 Email: terry@usedcarguys.net
💰 Payments available! 🎉

[2-3 enthusiastic sentences with emojis] ✨

[BLANK LINE HERE]

FEATURES:
* 🚗 [Feature] ✨
* ⚡ [Feature] 💙
* 🔒 [Feature] 🛡️
[12-15 bullets - each with emojis]

[BLANK LINE HERE]

KEY SPECS:
* 📏 Miles: XX,XXX ✨
* ⚙️ Engine: [details] 🔥
* ✅ EU Spec With Buy Back Guarantee 🎯

[BLANK LINE HERE]

💵 Price: $XX,XXX or payments from $XXX + 1yr warranty! 🎉✨

[BLANK LINE HERE]

[Write 2-3 paragraphs about the vehicle with emojis, separated by blank lines]

[BLANK LINE HERE]

WHY CHOOSE US: 🌟
✅ Serving Military since 2012 🇺🇸
✅ Buy Back Guarantee 🤝💙
✅ 2yr warranty available 🛡️
✅ We guide you through everything 👥✨
✅ Top trade-in prices 💰🚗
✅ Buy It Back When You Leave ✈️
✅ Military Inspection Guaranteed 🔍✅
✅ No SOFA Status needed 📋

[BLANK LINE HERE]

"Closest Thing to Leasing Overseas" 🌍✨

${callToAction} 🎉

[BLANK LINE HERE]

📞 Contact Terry:
📱 +49 151 6522 7520
📧 terry@usedcarguys.net

Visit us at Robert-Bosch-Straße 6, 71101 Schönaich (right near Panzer Kaserne!) 🚗

Come see us today! 🚗✨🎉

REQUIREMENTS:
- 600-900 words
- 50-70+ emojis minimum
- Add \\n\\n between paragraphs for readability
- VERY enthusiastic! 🎉✨🚀`

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