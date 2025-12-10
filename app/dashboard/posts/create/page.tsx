import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function CreatePostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-1">Schedule a post with AI-generated content</p>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Post Creation Coming Soon</h3>
          <p className="text-gray-600">
            Create and schedule posts with AI-powered content generation
          </p>
        </CardContent>
      </Card>
    </div>
  )
}