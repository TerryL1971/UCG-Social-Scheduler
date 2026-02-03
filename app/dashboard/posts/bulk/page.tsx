// app/dashboard/posts/bulk/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Upload,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PostsListSkeleton } from '@/components/ui/LoadingSkeletons'
import { toast } from 'sonner';

interface Post {
  id: string;
  scheduled_for: string;
  status: string;
  post_type: string;
  generated_content?: string;
  facebook_groups: {
    name: string;
  }[];
}

export default function BulkOperationsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          id,
          scheduled_for,
          status,
          post_type,
          generated_content,
          facebook_groups (name)
        `)
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.info('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectPost(postId: string) {
    setSelectedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  function selectAll() {
    const filtered = getFilteredPosts();
    setSelectedPosts(new Set(filtered.map(p => p.id)));
  }

  function deselectAll() {
    setSelectedPosts(new Set());
  }

  function getFilteredPosts() {
    if (statusFilter === 'all') return posts;
    return posts.filter(p => p.status === statusFilter);
  }

  async function bulkMarkPosted() {
    if (selectedPosts.size === 0) {
      toast.warning('Please select posts to mark as posted');
      return;
    }

    if (!confirm(`Mark ${selectedPosts.size} post(s) as posted?`)) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('post_schedules')
        .update({ 
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedPosts));

      if (error) throw error;

      alert(`✅ ${selectedPosts.size} post(s) marked as posted!`);
      setSelectedPosts(new Set());
      await loadPosts();
    } catch (error) {
      console.error('Error marking posts:', error);
      toast.info('Failed to mark posts as posted');
    } finally {
      setActionLoading(false);
    }
  }

  async function bulkRegenerateContent() {
    if (selectedPosts.size === 0) {
      toast.warning('Please select posts to regenerate');
      return;
    }

    if (!confirm(`Regenerate content for ${selectedPosts.size} post(s)? This may take a few minutes.`)) return;

    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const postId of Array.from(selectedPosts)) {
        try {
          const response = await fetch(`/api/posts/${postId}/regenerate`, {
            method: 'POST',
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      alert(`✅ Regenerated ${successCount} post(s)\n${failCount > 0 ? `❌ Failed: ${failCount}` : ''}`);
      setSelectedPosts(new Set());
      await loadPosts();
    } catch (error) {
      console.error('Error regenerating:', error);
      toast.info('Bulk regeneration failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function bulkDelete() {
    if (selectedPosts.size === 0) {
      toast.warning('Please select posts to delete');
      return;
    }

    if (!confirm(`⚠️ Permanently delete ${selectedPosts.size} post(s)? This cannot be undone.`)) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('post_schedules')
        .delete()
        .in('id', Array.from(selectedPosts));

      if (error) throw error;

      alert(`✅ Deleted ${selectedPosts.size} post(s)`);
      setSelectedPosts(new Set());
      await loadPosts();
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.info('Failed to delete posts');
    } finally {
      setActionLoading(false);
    }
  }

  async function exportToCSV() {
    const filtered = getFilteredPosts();
    if (filtered.length === 0) {
      toast.warning('No posts to export');
      return;
    }

    const csvContent = [
      ['Group', 'Scheduled For', 'Type', 'Status', 'Has Content'].join(','),
      ...filtered.map(post => [
        `"${post.facebook_groups[0]?.name}"`,
        new Date(post.scheduled_for).toLocaleString(),
        post.post_type,
        post.status,
        post.generated_content ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredPosts = getFilteredPosts();
  const allSelected = filteredPosts.length > 0 && filteredPosts.every(p => selectedPosts.has(p.id));

  if (loading) {
    return <PostsListSkeleton />
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-4 sm:py-8 max-w-7xl space-y-4 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Bulk Operations</h1>
        <p className="text-muted-foreground mt-1">
          Manage multiple posts at once
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{posts.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{selectedPosts.size}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">
              {posts.filter(p => p.status === 'scheduled').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Content Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
              {posts.filter(p => p.status === 'content_ready').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start lg:items-center justify-between">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter('all')}
              >
                All ({posts.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'scheduled' ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter('scheduled')}
              >
                Scheduled ({posts.filter(p => p.status === 'scheduled').length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'content_ready' ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter('content_ready')}
              >
                Ready ({posts.filter(p => p.status === 'content_ready').length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'posted' ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter('posted')}
              >
                Posted ({posts.filter(p => p.status === 'posted').length})
              </Button>
            </div>

            {/* Export */}
            <Button
              size="sm"
              variant="secondary"
              onClick={exportToCSV}
              icon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPosts.size > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 sm:gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">
                  {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="success"
                  onClick={bulkMarkPosted}
                  loading={actionLoading}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Mark as Posted
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={bulkRegenerateContent}
                  loading={actionLoading}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Regenerate Content
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={bulkDelete}
                  loading={actionLoading}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={deselectAll}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Posts</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No posts found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' ? 'Try changing your filter' : 'Create your first post to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className={`flex items-center gap-3 sm:gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPosts.has(post.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleSelectPost(post.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPosts.has(post.id)}
                    onChange={() => toggleSelectPost(post.id)}
                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {post.facebook_groups[0]?.name}
                      </h3>
                      <Badge
                        variant={
                          post.status === 'posted' ? 'success' :
                          post.status === 'content_ready' ? 'info' :
                          post.status === 'scheduled' ? 'default' :
                          'neutral'
                        }
                        dot
                      >
                        {post.status === 'content_ready' ? 'Ready' : post.status}
                      </Badge>
                      {post.generated_content && (
                        <Badge variant="success" dot>Has Content</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(post.scheduled_for)}
                      </span>
                      <span className="capitalize">
                        {post.post_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}