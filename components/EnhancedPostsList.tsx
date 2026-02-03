// components/EnhancedPostsList.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PostCardSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/toast';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  Copy,
  CheckCircle2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { formatDate, copyToClipboard, getStatusColor } from '@/lib/utils';
import { getUserFriendlyMessage } from '@/lib/errors';

interface Post {
  id: string;
  scheduled_for: string;
  status: string;
  post_type: string;
  generated_content?: string;
  reminder_sent: boolean;
  facebook_groups: {
    name: string;
    group_url?: string;
  }[];
}

export function EnhancedPostsList() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, statusFilter]);

  async function loadPosts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          id,
          scheduled_for,
          status,
          post_type,
          generated_content,
          reminder_sent,
          facebook_groups (
            name,
            group_url
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  function filterPosts() {
    let filtered = [...posts];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.facebook_groups?.[0]?.name.toLowerCase().includes(query) ||
        post.post_type.toLowerCase().includes(query) ||
        post.generated_content?.toLowerCase().includes(query)
      );
    }

    setFilteredPosts(filtered);
  }

  async function handleCopyContent(post: Post) {
    if (!post.generated_content) {
      toast.error('No content available');
      return;
    }

    const success = await copyToClipboard(post.generated_content);
    if (success) {
      toast.success('Content copied!');
    } else {
      toast.error('Failed to copy');
    }
  }

  async function handleMarkPosted(postId: string) {
    setActionLoading(postId);
    try {
      const response = await fetch(`/api/posts/${postId}/mark-posted`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed');

      toast.success('Marked as posted!');
      await loadPosts();
    } catch (error) {
      const message = getUserFriendlyMessage(error, 'load schedules')
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }

  const statusCounts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    content_ready: posts.filter(p => p.status === 'content_ready').length,
    posted: posts.filter(p => p.status === 'posted').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scheduled Posts</h1>
          <p className="text-muted-foreground mt-1">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/dashboard/posts/create')}
          icon={<Plus className="h-4 w-4" />}
        >
          Schedule Post
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({statusCounts.all})
              </Button>
              <Button
                variant={statusFilter === 'scheduled' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('scheduled')}
              >
                Scheduled ({statusCounts.scheduled})
              </Button>
              <Button
                variant={statusFilter === 'content_ready' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('content_ready')}
              >
                Ready ({statusCounts.content_ready})
              </Button>
              <Button
                variant={statusFilter === 'posted' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('posted')}
              >
                Posted ({statusCounts.posted})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No posts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Schedule your first post to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard/posts/create')}
                icon={<Plus className="h-4 w-4" />}
              >
                Schedule Post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map((post) => {
            const isOverdue = new Date(post.scheduled_for) < new Date() && post.status !== 'posted';
            const statusColor = getStatusColor(post.status);

            return (
              <Card key={post.id} hover>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Post Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {post.facebook_groups?.[0]?.name}
                        </h3>
                        <Badge variant={statusColor} dot>
                          {post.status === 'content_ready' ? 'Ready' : post.status}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="error" dot>Overdue</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(post.scheduled_for)}
                        </span>
                        <span>
                          {post.post_type.replace('_', ' ')}
                        </span>
                      </div>

                      {post.generated_content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.generated_content}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/posts/${post.id}/view`)}
                        icon={<Eye className="h-4 w-4" />}
                      >
                        View
                      </Button>

                      {post.generated_content && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyContent(post)}
                            icon={<Copy className="h-4 w-4" />}
                          >
                            Copy
                          </Button>

                          {post.status !== 'posted' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleMarkPosted(post.id)}
                              loading={actionLoading === post.id}
                              icon={<CheckCircle2 className="h-4 w-4" />}
                            >
                              Mark Posted
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
