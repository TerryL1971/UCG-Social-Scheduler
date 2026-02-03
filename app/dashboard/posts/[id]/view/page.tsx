// app/dashboard/posts/[id]/view/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/toast';
import { 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Calendar, 
  Clock, 
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { formatDate, copyToClipboard, getStatusColor } from '@/lib/utils';
import { getUserFriendlyMessage } from '@/lib/errors';

interface Post {
  id: string;
  scheduled_for: string;
  status: string;
  post_type: string;
  target_audience?: string;
  special_context?: string;
  special_offer?: string;
  generated_content?: string;
  reminder_sent: boolean;
  created_at: string;
  facebook_groups: {
    id: string;
    name: string;
    group_url?: string;
  };
}

export default function ViewPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPost();
  }, [params.id]);

  async function loadPost() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          *,
          facebook_groups (
            id,
            name,
            group_url
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      const message = getUserFriendlyMessage(error, 'load schedules')
      toast.error(message);
      router.push('/dashboard/posts');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyContent() {
    if (!post?.generated_content) {
      toast.error('No content to copy');
      return;
    }

    const success = await copyToClipboard(post.generated_content);
    if (success) {
      toast.success('Content copied!', 'Ready to paste into Facebook');
    } else {
      toast.error('Failed to copy', 'Please try selecting and copying manually');
    }
  }

  async function handleMarkPosted() {
    if (!post) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('post_schedules')
        .update({ status: 'posted' })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Marked as posted!');
      router.push('/dashboard/posts');
    } catch (error) {
      console.error('Error marking as posted:', error);
      const message = getUserFriendlyMessage(error, 'load schedules')
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRegenerateContent() {
    if (!post) return;

    setActionLoading(true);
    const loadingToast = toast.loading('Regenerating content...');

    try {
      const response = await fetch(`/api/posts/${post.id}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to regenerate');

      const data = await response.json();
      
      toast.dismiss(loadingToast);
      toast.success('Content regenerated!');
      
      // Reload post to show new content
      await loadPost();
    } catch (error) {
      console.error('Error regenerating:', error);
      toast.dismiss(loadingToast);
      const message = getUserFriendlyMessage(error, 'load schedules')
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-4 sm:py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-4 sm:py-8 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Post not found</h3>
            <Button onClick={() => router.push('/dashboard/posts')}>
              Back to Posts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOverdue = new Date(post.scheduled_for) < new Date();
  const statusColor = getStatusColor(post.status);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/posts')}
        icon={<ArrowLeft className="h-4 w-4" />}
        className="mb-6"
      >
        Back to Posts
      </Button>

      {/* Main Post Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle>{post.facebook_groups.name}</CardTitle>
                <Badge variant={statusColor} dot>
                  {post.status === 'content_ready' ? 'Ready to Post' : post.status}
                </Badge>
                {isOverdue && post.status !== 'posted' && (
                  <Badge variant="error" dot>Overdue</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.scheduled_for)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.post_type.replace('_', ' ')}
                </span>
              </div>
            </div>

            {post.facebook_groups.group_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(post.facebook_groups.group_url, '_blank')}
                icon={<ExternalLink className="h-4 w-4" />}
              >
                Open Group
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-4 sm:space-y-6">
          {/* Post Details */}
          <div className="grid gap-3 sm:gap-4">
            {post.target_audience && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Target Audience
                </h4>
                <p className="text-foreground">{post.target_audience}</p>
              </div>
            )}

            {post.special_context && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Special Context
                </h4>
                <p className="text-foreground">{post.special_context}</p>
              </div>
            )}

            {post.special_offer && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Special Offer
                </h4>
                <p className="text-foreground">{post.special_offer}</p>
              </div>
            )}
          </div>

          {/* Generated Content */}
          {post.generated_content ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Generated Content ({post.generated_content.length} characters)
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyContent}
                  icon={<Copy className="h-4 w-4" />}
                >
                  Copy
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                {post.generated_content}
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Content will be generated 2 hours before scheduled time
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground pt-4 border-t">
            <span>Created {formatDate(post.created_at)}</span>
            {post.reminder_sent && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reminder sent
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {post.status !== 'posted' && post.generated_content && (
            <>
              <Button
                variant="success"
                onClick={handleMarkPosted}
                loading={actionLoading}
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                Mark as Posted
              </Button>

              <Button
                variant="secondary"
                onClick={handleRegenerateContent}
                loading={actionLoading}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Regenerate Content
              </Button>
            </>
          )}

          {post.status === 'posted' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Posted Successfully</span>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/posts/${post.id}/edit`)}
            className="ml-auto"
          >
            Edit Post
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
