import './index.css';
import '@telegram-apps/telegram-ui/dist/styles.css';

import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Bootstrap } from '@/Bootstrap';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000, retry: 1 },
  },
});

const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap queryClient={queryClient} router={router} />
  </StrictMode>,
);
