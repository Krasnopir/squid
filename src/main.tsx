import './index.css';
import '@telegram-apps/telegram-ui/dist/styles.css';

import { AppRoot } from '@telegram-apps/telegram-ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { joinRoomByCode } from '@/api/roomApi';
import { hasSupabase } from '@/lib/config';
import { getInitData, getStartParam, expandWebApp } from '@/lib/telegram';
import { getSupabase } from '@/lib/supabase';
import { routeTree } from './routeTree.gen';
import { TON_CONNECT_MANIFEST_URL } from './lib/ton';
import { useRoomStore } from '@/store/roomStore';
import { useSessionStore } from '@/store/sessionStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000, retry: 1 },
  },
});

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function Bootstrap() {
  useEffect(() => {
    expandWebApp();
    useSessionStore.getState().setLoading(false);

    if (hasSupabase) {
      const sb = getSupabase();
      const initData = getInitData();
      if (sb && initData) {
        void sb.functions.invoke('verify-init-data', { body: { initData } });
      }
    }

    const start = getStartParam();
    if (start?.startsWith('room_')) {
      const code = start.replace('room_', '');
      void joinRoomByCode(code).then(room => {
        useRoomStore.getState().setRoom(room);
        router.navigate({ to: '/room/$roomId', params: { roomId: room.id } });
      });
    }
  }, []);

  return (
    <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL}>
      <AppRoot appearance="dark">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AppRoot>
    </TonConnectUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
