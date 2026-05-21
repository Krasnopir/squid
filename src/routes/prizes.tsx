import { createFileRoute } from '@tanstack/react-router';

import { PrizesPage } from '@/pages/PrizesPage';

export const Route = createFileRoute('/prizes')({
  component: PrizesPage,
});
