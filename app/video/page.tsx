'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoRoom } from '@/components/video/VideoRoom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function VideoPageContent() {
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || undefined;
  const name = searchParams.get('name') || undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <VideoRoom roomName={room} userName={name} />
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading video room...</span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VideoPageContent />
    </Suspense>
  );
}
