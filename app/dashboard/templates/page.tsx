import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post Templates</h1>
        <p className="text-gray-600 mt-1">Reusable templates for your posts</p>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Templates Coming Soon</h3>
          <p className="text-gray-600">Create reusable ad templates with AI assistance</p>
        </CardContent>
      </Card>
    </div>
  )
}