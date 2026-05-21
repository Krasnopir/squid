import { createFileRoute } from '@tanstack/react-router';

import { WalletPage } from '@/pages/WalletPage';

export const Route = createFileRoute('/wallet')({
  component: WalletPage,
});
