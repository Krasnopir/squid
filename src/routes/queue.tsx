import { createFileRoute } from '@tanstack/react-router';

import { QueuePage } from '@/pages/QueuePage';

export const Route = createFileRoute('/queue')({
  component: QueuePage,
});
