'use client';

import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoRoom } from '@/components/video/VideoRoom';

interface VideoRoomPageProps {
  params: Promise<{ room: string }>;
}

function VideoRoomContent({ room }: { room: string }) {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || undefined;

  return (
    <div className="min-h-screen bg-background">
      <VideoRoom roomName={room} userName={name} />
    </div>
  );
}

export default function VideoRoomPage({ params }: VideoRoomPageProps) {
  const { room } = use(params);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VideoRoomContent room={room} />
    </Suspense>
  );
}
