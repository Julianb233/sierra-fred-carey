'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoRoom } from '@/components/video/VideoRoom';

interface VideoRoomPageProps {
  params: Promise<{ room: string }>;
}

export default function VideoRoomPage({ params }: VideoRoomPageProps) {
  const { room } = use(params);
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || undefined;

  return (
    <div className="min-h-screen bg-background">
      <VideoRoom roomName={room} userName={name} />
    </div>
  );
}
