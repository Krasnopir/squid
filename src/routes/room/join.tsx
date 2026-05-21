import { createFileRoute } from '@tanstack/react-router';

import { JoinRoomPage } from '@/pages/JoinRoomPage';

export const Route = createFileRoute('/room/join')({
  component: JoinRoomPage,
});
