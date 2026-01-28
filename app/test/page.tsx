// app/test/page.tsx

'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/lib/toast';
import { Calendar } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-8 space-y-8">
      <h1 className="text-3xl font-bold">Design System Test</h1>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => toast.success('Success!')}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Loading</Button>
            <Button icon={<Calendar className="h-4 w-4" />}>With Icon</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <Input label="Email" placeholder="you@example.com" />
            <Input label="With Error" error="This is required" />
            <Input label="With Success" success="Looks good!" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="success" dot>Ready</Badge>
            <Badge variant="warning" dot>Pending</Badge>
            <Badge variant="error" dot>Failed</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}