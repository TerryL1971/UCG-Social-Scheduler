// app/api/posts/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY is not set')
      return NextResponse.json(
        { error: 'Google Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ 
      // Using gemini-2.5-flash to avoid quota issues
      model: 'gemini-2.5-flash',
      generationConfig: {
        // High token limit to allow for 500+ word posts
        maxOutputTokens: 1000,
        // FIX: Dropped temperature to 0.4 for maximum obedience and adherence to length/structure instructions.
        temperature: 0.4,
      }
    })

    const body = await request.json()
    
    const {
      productName,
      features,
      callToAction,
      tone,
      groupName,
      groupDescription,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      groupRules,
    } = body

    let groupContext = `This post is for the Facebook group "${groupName}".`
    if (groupDescription) {
      groupContext += ` Group description: ${groupDescription}.`
    }

    // FINAL PROMPT: Target length reinforced, maximum emphasis on writing the full post.
    const prompt = `You are a social media marketing and sales expert. Your goal is to create an authentic, highly engaging, and descriptive Facebook advertisement post that drives immediate action.

${groupContext}

--- DETAILS ---
Product: ${productName}
Features: ${features}
Call to Action: ${callToAction}
Tone: ${tone}

--- INSTRUCTIONS ---
1. Write a compelling, multi-paragraph post (target length: 300-500 words) using a ${tone} tone.
2. Start with an attention-grabbing hook related to the vehicle.
3. **Elaborate on the provided features** by dedicating at least one full paragraph to detailing the benefits (e.g., low miles = worry-free ownership, leather seats = premium comfort).
4. Structure the post with clear paragraph breaks, ensuring the content is substantial and fully developed.
5. Integrate emojis naturally to enhance readability and emotion.
6. Place the Call to Action at the end.
7. Absolutely No hashtags.
8. **CRITICAL:** You MUST write the full requested length of 300-500 words. Do NOT stop early or self-truncate the response.`

    console.log('Calling Gemini API with gemini-2.5-flash...')
    const result = await model.generateContent(prompt)
    const content = result.response.text()
    
    // --- DIAGNOSTIC LOGGING ---
    console.log('--- GENERATED CONTENT DIAGNOSTICS (SERVER) ---');
    console.log('Total Character Length:', content.length);
    // Log the first 150 characters to confirm content format
    console.log('Start of Content:', content.substring(0, 150) + '...');
    console.log('------------------------------------------------');
    // --- END DIAGNOSTIC LOGGING ---

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}