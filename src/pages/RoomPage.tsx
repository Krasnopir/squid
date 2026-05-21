import { useParams } from '@tanstack/react-router';

import { RoomView } from '@/features/room/RoomView';

export function RoomPage() {
  const { roomId } = useParams({ from: '/room/$roomId' });
  return <RoomView roomId={roomId} />;
}
