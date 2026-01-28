import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ App Router params are async
    const { id } = await params;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get post with group info
    const { data: post, error: postError } = await supabase
      .from('post_schedules')
      .select(
        `
        *,
        facebook_groups (
          name,
          description,
          group_type
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Build prompt for content generation
    const groupInfo = post.facebook_groups;

    const prompt = `Generate an engaging Facebook post for Used Car Guys (UCG), a used car dealership serving the USAG Stuttgart military community in Germany.

POST DETAILS:
- Post Type: ${post.post_type.replace('_', ' ')}
- Facebook Group: ${groupInfo.name}
- Group Type: ${groupInfo.group_type || 'Community engagement'}
${post.target_audience ? `- Target Audience: ${post.target_audience}` : ''}
${post.special_context ? `- Special Context: ${post.special_context}` : ''}
${post.special_offer ? `- Special Offer: ${post.special_offer}` : ''}

REQUIREMENTS:
1. Write naturally and conversationally for military families
2. Emphasize trust, reliability, and community service
3. Include relevant emojis naturally throughout
4. Make it engaging and actionable
5. Length: 300–500 words
6. End with a clear call-to-action

Generate the post content now:`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedContent =
      message.content[0]?.type === 'text'
        ? message.content[0].text
        : '';

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // Update post with regenerated content
    const { data: updatedPost, error: updateError } = await supabase
      .from('post_schedules')
      .update({
        generated_content: generatedContent,
        status: 'content_ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedPost) {
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      content: generatedContent,
    });
  } catch (error) {
    console.error('Error regenerating content:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate content' },
      { status: 500 }
    );
  }
}
